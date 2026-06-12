-- 0007 — Real scheduling + check-in windows/OTP/checkout + Crowd v1.
-- Adds real slot timestamps to bookings so check-in can be window-validated
-- (PRD 1.3-REQ2/AC2), an OTP fallback + gym override, manual/auto check-out, and
-- occupancy-based crowd computation (PRD Module 2).
-- NOTE: partner_checkin_by_code is further refined in 0007b (search all owned gyms).

-- ---- schema additions ----
alter table public.bookings add column if not exists starts_at timestamptz;
alter table public.bookings add column if not exists ends_at timestamptz;
alter table public.bookings add column if not exists checked_out boolean not null default false;
alter table public.bookings add column if not exists checkin_code text;

alter table public.gyms add column if not exists effective_capacity int not null default 40;
alter table public.gyms add column if not exists walkins int not null default 0;

alter table public.payments add column if not exists starts_at timestamptz;

-- ---- crowd recompute helper (internal: occupancy / effective capacity) ----
create or replace function public.recompute_crowd(p_gym_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_active int; v_occ int; v_cap int; v_pct numeric; v_bucket text;
begin
  if p_gym_id is null then return; end if;
  select count(*) into v_active from public.bookings
    where gym_id = p_gym_id and checked_in = true and checked_out = false
      and starts_at is not null
      and now() >= starts_at - interval '10 minutes'
      and now() <  ends_at  + interval '10 minutes';
  select coalesce(effective_capacity,0), coalesce(walkins,0) into v_cap, v_occ from public.gyms where id = p_gym_id;
  v_occ := v_active + v_occ;
  if v_cap <= 0 then
    v_bucket := 'Unknown';
  else
    v_pct := v_occ::numeric / v_cap;
    v_bucket := case when v_pct < 0.40 then 'Low'
                     when v_pct < 0.70 then 'Moderate'
                     when v_pct < 0.95 then 'High'
                     else 'Full' end;
  end if;
  update public.gyms set crowd = v_bucket, crowd_updated_at = now() where id = p_gym_id;
end; $$;
revoke execute on function public.recompute_crowd(text) from public, anon, authenticated;

-- ---- create_booking: now records real start/end + a 6-digit check-in code ----
drop function if exists public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text);
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
  v_code text; v_ends timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('slot','event') then raise exception 'invalid kind'; end if;
  v_balance := public.credit_balance();
  if v_credits > v_balance then raise exception 'insufficient credits (have %, requested %)', v_balance, v_credits; end if;

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
  return v_booking;
end; $$;
revoke execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) to authenticated;

-- ---- member self check-in: window-enforced + crowd recompute ----
create or replace function public.checkin(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings; v_grace interval := interval '10 minutes';
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found or not confirmable'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'booking not found or not confirmable'; end if;
  if v_booking.starts_at is not null then
    if now() < v_booking.starts_at - v_grace then raise exception 'check-in opens 10 minutes before your slot'; end if;
    if now() > v_booking.ends_at + v_grace then raise exception 'this slot''s check-in window has passed'; end if;
  end if;
  update public.bookings set checked_in = true, status = 'Completed' where id = p_booking_id returning * into v_booking;
  if v_booking.gym_id is not null then perform public.recompute_crowd(v_booking.gym_id); end if;
  return v_booking;
end; $$;
grant execute on function public.checkin(uuid) to authenticated;

-- ---- member manual check-out (improves crowd accuracy) ----
create or replace function public.checkout(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.bookings set checked_out = true
    where id = p_booking_id and user_id = v_uid and checked_in = true and checked_out = false
    returning * into v_booking;
  if not found then raise exception 'no active check-in to check out'; end if;
  if v_booking.gym_id is not null then perform public.recompute_crowd(v_booking.gym_id); end if;
  return v_booking;
end; $$;
revoke execute on function public.checkout(uuid) from public, anon;
grant execute on function public.checkout(uuid) to authenticated;

-- ---- partner check-in: window-enforced (override-able) + crowd recompute ----
drop function if exists public.partner_checkin(uuid);
create or replace function public.partner_checkin(p_booking_id uuid, p_override boolean default false)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings; v_grace interval := interval '10 minutes';
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking not found'; end if;
  if not exists (select 1 from public.gym_owners o where o.gym_id = v_booking.gym_id and o.user_id = v_uid) then
    raise exception 'you do not manage this gym';
  end if;
  if v_booking.status <> 'Confirmed' then raise exception 'booking is not awaiting check-in'; end if;
  if v_booking.starts_at is not null and not p_override then
    if now() < v_booking.starts_at - v_grace then raise exception 'check-in opens 10 minutes before the slot (override to force)'; end if;
    if now() > v_booking.ends_at + v_grace then raise exception 'slot window has passed (override to force)'; end if;
  end if;
  update public.bookings set checked_in = true, status = 'Completed' where id = p_booking_id returning * into v_booking;
  perform public.recompute_crowd(v_booking.gym_id);
  return v_booking;
end; $$;
revoke execute on function public.partner_checkin(uuid, boolean) from public, anon;
grant execute on function public.partner_checkin(uuid, boolean) to authenticated;

-- ---- OTP fallback: partner checks in by the member's 6-digit code ----
create or replace function public.partner_checkin_by_code(p_code text, p_gym_id text, p_override boolean default false)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.gym_owners o where o.gym_id = p_gym_id and o.user_id = v_uid) then
    raise exception 'you do not manage this gym';
  end if;
  select count(*) into v_n from public.bookings
    where gym_id = p_gym_id and checkin_code = p_code and status = 'Confirmed';
  if v_n = 0 then raise exception 'no booking awaiting check-in for that code'; end if;
  if v_n > 1 then raise exception 'multiple bookings match that code — scan the QR instead'; end if;
  select id into v_id from public.bookings
    where gym_id = p_gym_id and checkin_code = p_code and status = 'Confirmed' limit 1;
  return public.partner_checkin(v_id, p_override);
end; $$;
revoke execute on function public.partner_checkin_by_code(text,text,boolean) from public, anon;
grant execute on function public.partner_checkin_by_code(text,text,boolean) to authenticated;

-- ---- partner crowd quick-update widget (<=2 taps): manual level ----
create or replace function public.partner_set_crowd(p_gym_id text, p_level text)
returns public.gyms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym public.gyms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_level not in ('Low','Moderate','High','Full','Unknown') then raise exception 'invalid crowd level'; end if;
  if not exists (select 1 from public.gym_owners o where o.gym_id = p_gym_id and o.user_id = v_uid) then
    raise exception 'you do not manage this gym';
  end if;
  update public.gyms set crowd = p_level, crowd_updated_at = now() where id = p_gym_id returning * into v_gym;
  return v_gym;
end; $$;
revoke execute on function public.partner_set_crowd(text,text) from public, anon;
grant execute on function public.partner_set_crowd(text,text) to authenticated;

-- ---- partner walk-in count (feeds occupancy) ----
create or replace function public.partner_set_walkins(p_gym_id text, p_count int)
returns public.gyms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym public.gyms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.gym_owners o where o.gym_id = p_gym_id and o.user_id = v_uid) then
    raise exception 'you do not manage this gym';
  end if;
  update public.gyms set walkins = greatest(coalesce(p_count,0),0) where id = p_gym_id;
  perform public.recompute_crowd(p_gym_id);
  select * into v_gym from public.gyms where id = p_gym_id;
  return v_gym;
end; $$;
revoke execute on function public.partner_set_walkins(text,int) from public, anon;
grant execute on function public.partner_set_walkins(text,int) to authenticated;
