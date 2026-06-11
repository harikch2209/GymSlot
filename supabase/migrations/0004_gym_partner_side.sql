-- Gym partner side: ownership, partner read access to their gyms' bookings,
-- claim/check-in RPCs, and a denormalised member_name on bookings.

alter table public.bookings add column if not exists member_name text;

create table if not exists public.gym_owners (
  gym_id text not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);
alter table public.gym_owners enable row level security;
create policy gym_owners_self on public.gym_owners for select using (auth.uid() = user_id);

-- Partners may read bookings for gyms they own (users still read their own).
create policy bookings_partner_select on public.bookings for select using (
  exists (select 1 from public.gym_owners o where o.gym_id = bookings.gym_id and o.user_id = auth.uid())
);

create or replace function public.claim_gym(p_gym_id text)
returns public.gym_owners language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.gym_owners;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.gyms where id = p_gym_id) then raise exception 'gym not found'; end if;
  insert into public.gym_owners (gym_id, user_id) values (p_gym_id, v_uid) on conflict do nothing;
  select * into v_row from public.gym_owners where gym_id = p_gym_id and user_id = v_uid;
  return v_row;
end; $$;
revoke execute on function public.claim_gym(text) from public, anon;
grant execute on function public.claim_gym(text) to authenticated;

create or replace function public.partner_checkin(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then raise exception 'booking not found'; end if;
  if not exists (select 1 from public.gym_owners o where o.gym_id = v_booking.gym_id and o.user_id = v_uid) then
    raise exception 'you do not manage this gym';
  end if;
  if v_booking.status <> 'Confirmed' then raise exception 'booking is not awaiting check-in'; end if;
  update public.bookings set checked_in = true, status = 'Completed' where id = p_booking_id returning * into v_booking;
  update public.gyms set crowd_updated_at = now() where id = v_booking.gym_id;
  return v_booking;
end; $$;
revoke execute on function public.partner_checkin(uuid) from public, anon;
grant execute on function public.partner_checkin(uuid) to authenticated;

-- NOTE: create_booking is also updated in this migration to populate member_name
-- (see 0002 for the base definition; the deployed version sets member_name from
-- the caller's profile). Re-apply create_booking from the live schema if recreating.
