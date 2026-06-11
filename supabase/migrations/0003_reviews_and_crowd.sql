-- Reviews (world-readable; written only via submit_review, which requires the
-- caller to have booked the gym) + check-in-driven live crowd.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  gym_id text not null references public.gyms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_gym_idx on public.reviews(gym_id, created_at desc);
create unique index if not exists reviews_user_gym_uniq on public.reviews(gym_id, user_id) where user_id is not null;

alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select using (true);

create or replace function public.submit_review(p_gym_id text, p_rating int, p_comment text default null)
returns public.reviews language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_name text; v_review public.reviews;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be between 1 and 5'; end if;
  if not exists (select 1 from public.bookings where user_id = v_uid and gym_id = p_gym_id) then
    raise exception 'you can only review a gym you have booked';
  end if;
  select coalesce(full_name, 'GymSlot member') into v_name from public.profiles where id = v_uid;
  insert into public.reviews (gym_id, user_id, reviewer_name, rating, comment)
  values (p_gym_id, v_uid, coalesce(v_name,'GymSlot member'), p_rating, nullif(trim(p_comment),''))
  on conflict (gym_id, user_id) where user_id is not null
    do update set rating = excluded.rating, comment = excluded.comment, created_at = now()
  returning * into v_review;
  return v_review;
end; $$;
revoke execute on function public.submit_review(text,int,text) from public, anon;
grant execute on function public.submit_review(text,int,text) to authenticated;

-- Checking in nudges the gym one bucket busier and stamps freshness (live crowd).
create or replace function public.checkin(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_booking public.bookings;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.bookings set checked_in = true, status = 'Completed'
    where id = p_booking_id and user_id = v_uid and status = 'Confirmed' returning * into v_booking;
  if not found then raise exception 'booking not found or not confirmable'; end if;
  if v_booking.gym_id is not null then
    update public.gyms set crowd = case crowd
        when 'Low' then 'Moderate' when 'Moderate' then 'High'
        when 'High' then 'Full' when 'Unknown' then 'Moderate' else 'Full' end,
      crowd_updated_at = now() where id = v_booking.gym_id;
  end if;
  return v_booking;
end; $$;
revoke execute on function public.checkin(uuid) from public, anon;
grant execute on function public.checkin(uuid) to authenticated;
