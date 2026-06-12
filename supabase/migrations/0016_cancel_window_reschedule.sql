-- 0016 — Free-cancel window + reschedule (PRD 1.2-REQ4 / 1.2-REQ5).
-- Cancellations inside the 2-hour free window refund (credits + 5% bonus, or
-- credit portion); a late cancel = no-show = no refund. Reschedule re-validates
-- the new slot (same gym, verified, capacity, blackout, >2h out).

create or replace function public.cancel_booking(p_booking_id uuid, p_as_credits boolean)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_bonus int;
  v_late boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings
    where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'only confirmed bookings can be cancelled'; end if;

  -- Past the 2-hour free-cancel window → treated as a no-show (no refund).
  v_late := v_booking.starts_at is not null and now() > v_booking.starts_at - interval '2 hours';

  update public.bookings set status = 'Cancelled' where id = p_booking_id returning * into v_booking;

  if not v_late then
    if p_as_credits and v_booking.amount_paid > 0 then
      v_bonus := round(v_booking.amount_paid * 0.05);
      insert into public.credit_ledger (user_id, amount, reason, label, reference)
      values (v_uid, v_booking.amount_paid + v_bonus, 'cancellation-bonus',
              'Refund as credits (+5% bonus) — ' || v_booking.title, v_booking.id::text);
    end if;
    if v_booking.credits_used > 0 then
      insert into public.credit_ledger (user_id, amount, reason, label, reference)
      values (v_uid, v_booking.credits_used, 'refund',
              'Credit portion returned — ' || v_booking.title, v_booking.id::text);
    end if;
  end if;

  begin
    perform public.enqueue_notification(v_uid, 'refund_status',
      case when v_late then 'Cancelled — no refund'
           when p_as_credits and v_booking.amount_paid > 0 then 'Refunded to credits (+5% bonus)'
           when v_booking.amount_paid > 0 then 'Refund initiated'
           else 'Booking cancelled' end,
      'Your booking "' || v_booking.title || '" was cancelled.' ||
        case when v_late then ' It was within 2 hours of your slot, so no refund applies.'
             when p_as_credits and v_booking.amount_paid > 0
               then ' ₹' || (v_booking.amount_paid + round(v_booking.amount_paid * 0.05))::text || ' added to your wallet.'
             when v_booking.amount_paid > 0
               then ' ₹' || v_booking.amount_paid::text || ' will be refunded to your source within 24h.'
             else '' end,
      jsonb_build_object('bookingId', v_booking.id),
      v_booking.id::text);
  exception when others then null;
  end;

  return v_booking;
end; $$;
revoke execute on function public.cancel_booking(uuid, boolean) from public, anon;
grant execute on function public.cancel_booking(uuid, boolean) to authenticated;

-- ---- reschedule a confirmed slot booking to a new slot (same gym) ----
create or replace function public.reschedule_booking(
  p_booking_id uuid, p_slot_id text, p_booking_date text, p_time text,
  p_starts_at timestamptz, p_title text, p_duration_mins int
) returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_booking public.bookings;
  v_capacity int; v_slot_gym text; v_gym_status text; v_booked int; v_day text; v_ends timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'only confirmed bookings can be rescheduled'; end if;
  if v_booking.kind <> 'slot' then raise exception 'only slot bookings can be rescheduled'; end if;
  if v_booking.starts_at is not null and now() > v_booking.starts_at - interval '2 hours' then
    raise exception 'too late to reschedule (within 2 hours of your slot)';
  end if;

  select s.capacity, s.gym_id into v_capacity, v_slot_gym from public.slots s where s.id = p_slot_id for update;
  if v_capacity is null then raise exception 'slot not found'; end if;
  if v_slot_gym is distinct from v_booking.gym_id then raise exception 'reschedule must stay at the same gym'; end if;
  select g.status into v_gym_status from public.gyms g where g.id = v_slot_gym;
  if v_gym_status is distinct from 'verified' then raise exception 'this gym is not available for booking'; end if;

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
