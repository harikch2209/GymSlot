-- 0007b — Let the OTP-fallback check-in search across ALL gyms the partner owns
-- when no specific gym is given (the scanner doesn't preselect a gym).
create or replace function public.partner_checkin_by_code(p_code text, p_gym_id text default null, p_override boolean default false)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_n int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select count(*) into v_n from public.bookings b
    where b.checkin_code = p_code and b.status = 'Confirmed'
      and exists (select 1 from public.gym_owners o where o.gym_id = b.gym_id and o.user_id = v_uid)
      and (p_gym_id is null or b.gym_id = p_gym_id);
  if v_n = 0 then raise exception 'no booking awaiting check-in for that code'; end if;
  if v_n > 1 then raise exception 'multiple bookings match that code — scan the QR instead'; end if;
  select b.id into v_id from public.bookings b
    where b.checkin_code = p_code and b.status = 'Confirmed'
      and exists (select 1 from public.gym_owners o where o.gym_id = b.gym_id and o.user_id = v_uid)
      and (p_gym_id is null or b.gym_id = p_gym_id)
    limit 1;
  return public.partner_checkin(v_id, p_override);
end; $$;
revoke execute on function public.partner_checkin_by_code(text,text,boolean) from public, anon;
grant execute on function public.partner_checkin_by_code(text,text,boolean) to authenticated;
