-- 0010 — Close the verification gate at the booking boundary + fix blackouts.
-- Review of Module 3 found the 3-AC2 gate was enforced only by the gyms READ
-- RLS: create_booking never checked gyms.status and slots were world-readable,
-- so a pending/rejected gym stayed bookable by anyone holding a slot_id. Also,
-- the blackout guard compared bl.blackout_date (ISO yyyy-mm-dd, from the new
-- partner UI) against bookings.booking_date (a day LABEL like 'Today'/'Mon'),
-- so blackouts never blocked anything. Both fixed here.

-- ---- slots: visible to the public only for verified gyms (owner/admin see own) ----
drop policy if exists slots_read on public.slots;
drop policy if exists slots_read_public on public.slots;
drop policy if exists slots_read_manage on public.slots;
create policy slots_read_public on public.slots for select to anon, authenticated
  using (exists (select 1 from public.gyms g where g.id = slots.gym_id and g.status = 'verified'));
create policy slots_read_manage on public.slots for select to authenticated
  using (
    exists (select 1 from public.gym_owners o where o.gym_id = slots.gym_id and o.user_id = auth.uid())
    or exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

-- ---- create_booking: gate on the slot/event's gym being verified + ISO-correct blackout ----
create or replace function public.create_booking(
  p_kind text, p_gym_id text, p_gym_name text, p_title text, p_booking_date text,
  p_time text, p_duration_mins int, p_amount_paid int, p_credits_used int default 0,
  p_slot_id text default null, p_event_id text default null,
  p_trainer_id text default null, p_trainer_name text default null,
  p_starts_at timestamptz default null
) returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_balance int;
  v_credits int := greatest(coalesce(p_credits_used,0),0);
  v_amount int := greatest(coalesce(p_amount_paid,0),0);
  v_member text; v_booking public.bookings;
  v_capacity int; v_booked int; v_seed int; v_user_event_count int;
  v_per_user_limit constant int := 2;
  v_code text; v_ends timestamptz; v_owner record;
  v_slot_gym text; v_event_gym text; v_gym_status text; v_booking_day text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('slot','event') then raise exception 'invalid kind'; end if;
  v_balance := public.credit_balance();
  if v_credits > v_balance then raise exception 'insufficient credits (have %, requested %)', v_balance, v_credits; end if;

  -- The real calendar date this booking falls on (IST), used for blackouts.
  v_booking_day := coalesce(to_char(p_starts_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), p_booking_date);

  if p_kind = 'slot' then
    if p_slot_id is null then raise exception 'slot id required'; end if;
    select s.capacity, s.gym_id into v_capacity, v_slot_gym from public.slots s where s.id = p_slot_id for update;
    if v_capacity is null then raise exception 'slot not found'; end if;
    -- Verification gate: only verified gyms are bookable.
    select g.status into v_gym_status from public.gyms g where g.id = v_slot_gym;
    if v_gym_status is distinct from 'verified' then raise exception 'this gym is not available for booking yet'; end if;
    if exists (
      select 1 from public.gym_blackouts bl
      where bl.gym_id = v_slot_gym and bl.blackout_date = v_booking_day
        and (bl.slot_id is null or bl.slot_id = p_slot_id)
    ) then raise exception 'this slot is blocked for that date'; end if;
    select count(*) into v_booked from public.bookings
      where slot_id = p_slot_id and booking_date = p_booking_date and status in ('Confirmed','Completed');
    if v_booked >= v_capacity then raise exception 'slot is full'; end if;
  else
    if p_event_id is null then raise exception 'event id required'; end if;
    select e.capacity, e.reserved_seed, e.gym_id into v_capacity, v_seed, v_event_gym
      from public.events e where e.id = p_event_id for update;
    if v_capacity is null then raise exception 'event not found'; end if;
    if v_event_gym is not null then
      select g.status into v_gym_status from public.gyms g where g.id = v_event_gym;
      if v_gym_status is distinct from 'verified' then raise exception 'this gym is not available for booking yet'; end if;
    end if;
    select count(*) into v_booked from public.bookings
      where event_id = p_event_id and status in ('Confirmed','Completed');
    if coalesce(v_seed,0) + v_booked >= v_capacity then raise exception 'event is sold out'; end if;
    select count(*) into v_user_event_count from public.bookings
      where event_id = p_event_id and user_id = v_uid and status in ('Confirmed','Completed');
    if v_user_event_count >= v_per_user_limit then
      raise exception 'reservation limit reached for this event (max %)', v_per_user_limit;
    end if;
  end if;

  select coalesce(full_name,'Member') into v_member from public.profiles where id = v_uid;
  v_code := lpad(((floor(random()*900000))::int + 100000)::text, 6, '0');
  v_ends := case when p_starts_at is not null then p_starts_at + make_interval(mins => greatest(p_duration_mins,0)) else null end;

  insert into public.bookings (user_id,kind,gym_id,gym_name,slot_id,event_id,title,booking_date,time,
    duration_mins,amount_paid,credits_used,trainer_id,trainer_name,trainer_status,status,qr_payload,checked_in,member_name,
    starts_at,ends_at,checkin_code)
  values (v_uid,p_kind,p_gym_id,p_gym_name,p_slot_id,p_event_id,p_title,p_booking_date,p_time,
    p_duration_mins,v_amount,v_credits,p_trainer_id,p_trainer_name,
    case when p_trainer_id is not null then 'Assigned' else null end,'Confirmed','GYMSLOT|PENDING',false,
    coalesce(v_member,'Member'), p_starts_at, v_ends, v_code)
  returning * into v_booking;

  update public.bookings set qr_payload = 'GYMSLOT|'||upper(p_kind)||'|'||v_booking.id::text||'|'||coalesce(p_gym_id,'')
    where id = v_booking.id returning * into v_booking;

  if v_credits > 0 then
    insert into public.credit_ledger (user_id,amount,reason,label,reference)
    values (v_uid,-v_credits,'spend','Applied to '||p_title,v_booking.id::text);
  end if;

  begin
    perform public.enqueue_notification(v_uid, 'booking_confirmation',
      'Booking confirmed',
      p_title || ' · ' || p_gym_name || ' · ' || p_booking_date || ' ' || p_time,
      jsonb_build_object('bookingId', v_booking.id, 'kind', p_kind, 'gymId', p_gym_id),
      v_booking.id::text);
    for v_owner in select user_id from public.gym_owners where gym_id = p_gym_id loop
      perform public.enqueue_notification(v_owner.user_id, 'gym_new_booking',
        'New booking',
        coalesce(v_member,'A member') || ' booked ' || p_title || ' · ' || p_booking_date || ' ' || p_time,
        jsonb_build_object('bookingId', v_booking.id, 'gymId', p_gym_id),
        v_booking.id::text);
    end loop;
  exception when others then null;
  end;

  return v_booking;
end; $$;
revoke execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) to authenticated;
