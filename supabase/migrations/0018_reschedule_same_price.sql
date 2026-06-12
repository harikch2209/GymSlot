-- 0018 — Reschedule must stay same-price (Module 1.2 review fix).
-- reschedule_booking left amount_paid/credits_used stale, so moving to a cheaper
-- or pricier slot mismatched the receipt/earnings and enabled a cancel-bonus
-- exploit (book pricey → reschedule cheap → cancel in-window for 5% of the old
-- amount). Demo policy: only allow rescheduling to a slot of the SAME price as the
-- one originally booked; a different price must be a cancel + rebook.
create or replace function public.reschedule_booking(
  p_booking_id uuid, p_slot_id text, p_booking_date text, p_time text,
  p_starts_at timestamptz, p_title text, p_duration_mins int
) returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_booking public.bookings;
  v_capacity int; v_slot_gym text; v_gym_status text; v_booked int; v_day text; v_ends timestamptz;
  v_new_price int; v_old_price int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'only confirmed bookings can be rescheduled'; end if;
  if v_booking.kind <> 'slot' then raise exception 'only slot bookings can be rescheduled'; end if;
  if v_booking.starts_at is not null and now() > v_booking.starts_at - interval '2 hours' then
    raise exception 'too late to reschedule (within 2 hours of your slot)';
  end if;

  select s.capacity, s.gym_id, s.price into v_capacity, v_slot_gym, v_new_price from public.slots s where s.id = p_slot_id for update;
  if v_capacity is null then raise exception 'slot not found'; end if;
  if v_slot_gym is distinct from v_booking.gym_id then raise exception 'reschedule must stay at the same gym'; end if;
  select g.status into v_gym_status from public.gyms g where g.id = v_slot_gym;
  if v_gym_status is distinct from 'verified' then raise exception 'this gym is not available for booking'; end if;

  -- Same-price guard (keeps amount_paid / receipt / refunds consistent).
  select price into v_old_price from public.slots where id = v_booking.slot_id;
  if v_old_price is null or v_new_price is distinct from v_old_price then
    raise exception 'you can only reschedule to a same-price slot — cancel and rebook for a different price';
  end if;

  v_day := coalesce(to_char(p_starts_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), p_booking_date);
  if exists (
    select 1 from public.gym_blackouts bl
    where bl.gym_id = v_slot_gym and bl.blackout_date = v_day and (bl.slot_id is null or bl.slot_id = p_slot_id)
  ) then raise exception 'this slot is blocked for that date'; end if;

  select count(*) into v_booked from public.bookings
    where slot_id = p_slot_id and booking_date = p_booking_date and status in ('Confirmed','Completed') and id <> p_booking_id;
  if v_booked >= v_capacity then raise exception 'slot is full'; end if;

  v_ends := case when p_starts_at is not null then p_starts_at + make_interval(mins => greatest(coalesce(p_duration_mins, v_booking.duration_mins),0)) else null end;
  update public.bookings set
    slot_id = p_slot_id, booking_date = p_booking_date, time = p_time,
    title = coalesce(nullif(trim(p_title),''), title),
    duration_mins = coalesce(p_duration_mins, duration_mins),
    starts_at = p_starts_at, ends_at = v_ends, reminded_at = null
  where id = p_booking_id returning * into v_booking;

  begin
    perform public.enqueue_notification(v_uid, 'booking_confirmation', 'Booking rescheduled',
      v_booking.title || ' · ' || v_booking.gym_name || ' · ' || p_booking_date || ' ' || p_time,
      jsonb_build_object('bookingId', v_booking.id), v_booking.id::text);
  exception when others then null;
  end;
  return v_booking;
end; $$;
revoke execute on function public.reschedule_booking(uuid,text,text,text,timestamptz,text,int) from public, anon;
grant execute on function public.reschedule_booking(uuid,text,text,text,timestamptz,text,int) to authenticated;
