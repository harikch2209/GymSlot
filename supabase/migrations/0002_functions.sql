-- All money/ownership logic runs server-side as SECURITY DEFINER functions so a
-- malicious client can't forge credit amounts, refunds, or another user's bookings.
-- Each function re-derives the caller from auth.uid().

create or replace function public.credit_balance()
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from public.credit_ledger where user_id = auth.uid();
$$;

create or replace function public.ensure_profile(p_full_name text default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_profile public.profiles; v_existed boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select exists(select 1 from public.profiles where id = v_uid) into v_existed;
  insert into public.profiles (id, full_name) values (v_uid, p_full_name)
  on conflict (id) do update set full_name = coalesce(public.profiles.full_name, excluded.full_name)
  returning * into v_profile;
  if not v_existed and not exists (
    select 1 from public.credit_ledger where user_id = v_uid and reason = 'promo' and label = 'Welcome bonus'
  ) then
    insert into public.credit_ledger (user_id, amount, reason, label)
    values (v_uid, 250, 'promo', 'Welcome bonus');
  end if;
  return v_profile;
end; $$;

create or replace function public.slot_availability(p_gym_id text, p_date text)
returns table(slot_id text, capacity int, booked int, remaining int)
language sql stable security definer set search_path = public as $$
  select s.id, s.capacity, coalesce(b.cnt,0)::int, greatest(s.capacity - coalesce(b.cnt,0),0)::int
  from public.slots s
  left join (
    select slot_id, count(*) cnt from public.bookings
    where gym_id = p_gym_id and booking_date = p_date and status in ('Confirmed','Completed')
    group by slot_id
  ) b on b.slot_id = s.id
  where s.gym_id = p_gym_id;
$$;

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
  v_booking public.bookings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('slot','event') then raise exception 'invalid kind'; end if;
  v_balance := public.credit_balance();
  if v_credits > v_balance then raise exception 'insufficient credits (have %, requested %)', v_balance, v_credits; end if;
  insert into public.bookings (user_id,kind,gym_id,gym_name,slot_id,event_id,title,booking_date,time,
    duration_mins,amount_paid,credits_used,trainer_id,trainer_name,trainer_status,status,qr_payload,checked_in)
  values (v_uid,p_kind,p_gym_id,p_gym_name,p_slot_id,p_event_id,p_title,p_booking_date,p_time,
    p_duration_mins,v_amount,v_credits,p_trainer_id,p_trainer_name,
    case when p_trainer_id is not null then 'Assigned' else null end,'Confirmed','GYMSLOT|PENDING',false)
  returning * into v_booking;
  update public.bookings set qr_payload = 'GYMSLOT|'||upper(p_kind)||'|'||v_booking.id::text||'|'||coalesce(p_gym_id,'')
    where id = v_booking.id returning * into v_booking;
  if v_credits > 0 then
    insert into public.credit_ledger (user_id,amount,reason,label,reference)
    values (v_uid,-v_credits,'spend','Applied to '||p_title,v_booking.id::text);
  end if;
  return v_booking;
end; $$;

create or replace function public.cancel_booking(p_booking_id uuid, p_as_credits boolean)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings; v_bonus int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'only confirmed bookings can be cancelled'; end if;
  update public.bookings set status = 'Cancelled' where id = p_booking_id returning * into v_booking;
  if p_as_credits and v_booking.amount_paid > 0 then
    v_bonus := round(v_booking.amount_paid * 0.05);
    insert into public.credit_ledger (user_id,amount,reason,label,reference)
    values (v_uid, v_booking.amount_paid + v_bonus, 'cancellation-bonus',
            'Refund as credits (+5% bonus) — '||v_booking.title, v_booking.id::text);
  end if;
  if v_booking.credits_used > 0 then
    insert into public.credit_ledger (user_id,amount,reason,label,reference)
    values (v_uid, v_booking.credits_used, 'refund', 'Credit portion returned — '||v_booking.title, v_booking.id::text);
  end if;
  return v_booking;
end; $$;

create or replace function public.checkin(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.bookings set checked_in = true, status = 'Completed'
    where id = p_booking_id and user_id = v_uid and status = 'Confirmed' returning * into v_booking;
  if not found then raise exception 'booking not found or not confirmable'; end if;
  return v_booking;
end; $$;

-- Strip the implicit PUBLIC execute grant; only signed-in users may invoke.
revoke execute on function public.credit_balance() from public, anon;
revoke execute on function public.ensure_profile(text) from public, anon;
revoke execute on function public.slot_availability(text,text) from public, anon;
revoke execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text) from public, anon;
revoke execute on function public.cancel_booking(uuid,boolean) from public, anon;
revoke execute on function public.checkin(uuid) from public, anon;
grant execute on function public.credit_balance() to authenticated;
grant execute on function public.ensure_profile(text) to authenticated;
grant execute on function public.slot_availability(text,text) to authenticated;
grant execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text) to authenticated;
grant execute on function public.cancel_booking(uuid,boolean) to authenticated;
grant execute on function public.checkin(uuid) to authenticated;
