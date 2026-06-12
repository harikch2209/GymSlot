-- 0006 — Booking integrity: atomic capacity (slots + events), per-user event
-- reservation limit (default 2), and blackout-date rejection. All enforced INSIDE
-- create_booking, serialised by a FOR UPDATE row lock so concurrent bookings
-- cannot overbook. Fixes PRD 1.2-AC1, 8-AC2, 8-AC3 and the per-user event limit.
--
-- NOTE: this re-creates the *live* create_booking (which sets member_name from the
-- caller's profile — see 0004) and adds the guards; keep this file as the source of truth.

create table if not exists public.gym_blackouts (
  id uuid primary key default gen_random_uuid(),
  gym_id text not null references public.gyms(id) on delete cascade,
  blackout_date text not null,                                  -- matches bookings.booking_date label
  slot_id text references public.slots(id) on delete cascade,   -- null = whole day
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists gym_blackouts_idx on public.gym_blackouts(gym_id, blackout_date);
alter table public.gym_blackouts enable row level security;
drop policy if exists gym_blackouts_read on public.gym_blackouts;
create policy gym_blackouts_read on public.gym_blackouts for select using (true);
-- writes happen only via owner RPCs (partner module) / service role.

create or replace function public.create_booking(
  p_kind text, p_gym_id text, p_gym_name text, p_title text, p_booking_date text,
  p_time text, p_duration_mins int, p_amount_paid int, p_credits_used int default 0,
  p_slot_id text default null, p_event_id text default null,
  p_trainer_id text default null, p_trainer_name text default null
) returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_balance int;
  v_credits int := greatest(coalesce(p_credits_used,0),0);
  v_amount int := greatest(coalesce(p_amount_paid,0),0);
  v_member text; v_booking public.bookings;
  v_capacity int; v_booked int; v_seed int; v_user_event_count int;
  v_per_user_limit constant int := 2;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('slot','event') then raise exception 'invalid kind'; end if;
  v_balance := public.credit_balance();
  if v_credits > v_balance then raise exception 'insufficient credits (have %, requested %)', v_balance, v_credits; end if;

  -- ----- atomic capacity / availability guards (serialised by row lock) -----
  if p_kind = 'slot' then
    if p_slot_id is null then raise exception 'slot id required'; end if;
    select s.capacity into v_capacity from public.slots s where s.id = p_slot_id for update;
    if v_capacity is null then raise exception 'slot not found'; end if;
    if exists (
      select 1 from public.gym_blackouts bl
      where bl.gym_id = p_gym_id and bl.blackout_date = p_booking_date
        and (bl.slot_id is null or bl.slot_id = p_slot_id)
    ) then raise exception 'this slot is blocked for that date'; end if;
    select count(*) into v_booked from public.bookings
      where slot_id = p_slot_id and booking_date = p_booking_date and status in ('Confirmed','Completed');
    if v_booked >= v_capacity then raise exception 'slot is full'; end if;
  else
    if p_event_id is null then raise exception 'event id required'; end if;
    select e.capacity, e.reserved_seed into v_capacity, v_seed from public.events e where e.id = p_event_id for update;
    if v_capacity is null then raise exception 'event not found'; end if;
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

  insert into public.bookings (user_id,kind,gym_id,gym_name,slot_id,event_id,title,booking_date,time,
    duration_mins,amount_paid,credits_used,trainer_id,trainer_name,trainer_status,status,qr_payload,checked_in,member_name)
  values (v_uid,p_kind,p_gym_id,p_gym_name,p_slot_id,p_event_id,p_title,p_booking_date,p_time,
    p_duration_mins,v_amount,v_credits,p_trainer_id,p_trainer_name,
    case when p_trainer_id is not null then 'Assigned' else null end,'Confirmed','GYMSLOT|PENDING',false,
    coalesce(v_member,'Member'))
  returning * into v_booking;

  update public.bookings set qr_payload = 'GYMSLOT|'||upper(p_kind)||'|'||v_booking.id::text||'|'||coalesce(p_gym_id,'')
    where id = v_booking.id returning * into v_booking;

  if v_credits > 0 then
    insert into public.credit_ledger (user_id,amount,reason,label,reference)
    values (v_uid,-v_credits,'spend','Applied to '||p_title,v_booking.id::text);
  end if;
  return v_booking;
end; $$;
