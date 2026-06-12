-- 0017 — Personal Trainer Marketplace (PRD Module 4).
-- Trainer accounts + verification + availability + service radius, and a
-- request → broadcast → atomic first-accept → cutoff-unmatch matching flow with
-- reliability tracking. All writes via SECURITY DEFINER RPCs.

-- ---- trainer profile additions ----
alter table public.trainers add column if not exists user_id uuid references auth.users(id);
alter table public.trainers add column if not exists verified boolean not null default true;
alter table public.trainers add column if not exists available boolean not null default true;
alter table public.trainers add column if not exists service_radius_km int not null default 12;
alter table public.trainers add column if not exists lat double precision;
alter table public.trainers add column if not exists lng double precision;
alter table public.trainers add column if not exists completed_sessions int not null default 0;
alter table public.trainers add column if not exists cancelled_count int not null default 0;
create unique index if not exists trainers_user_id_uidx on public.trainers (user_id) where user_id is not null;

-- great-circle distance in km (used for radius eligibility)
create or replace function public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lng2 - lng1) / 2)), 2)
  ));
$$;

-- ---- become / manage a trainer ----
create or replace function public.become_trainer(
  p_name text, p_specializations text[], p_experience_years int, p_fee_30 int, p_fee_60 int,
  p_languages text[], p_bio text, p_lat double precision default 12.9716, p_lng double precision default 77.5946,
  p_service_radius_km int default 12
) returns public.trainers language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id text; v_t public.trainers;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.trainers where user_id = v_uid;
  if found then return v_t; end if;  -- already a trainer
  if coalesce(trim(p_name),'') = '' then raise exception 'name is required'; end if;
  v_id := 't_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  insert into public.trainers (id,name,specializations,experience_years,rating,fee_30,fee_60,languages,avatar_url,bio,
      user_id,verified,available,service_radius_km,lat,lng)
  values (v_id, p_name, coalesce(p_specializations,'{}'), greatest(coalesce(p_experience_years,0),0), 0,
      greatest(coalesce(p_fee_30,0),0), greatest(coalesce(p_fee_60,0),0), coalesce(p_languages,'{}'), null, p_bio,
      v_uid, true, true, greatest(coalesce(p_service_radius_km,12),1), p_lat, p_lng)
  returning * into v_t;
  return v_t;
end; $$;
revoke execute on function public.become_trainer(text,text[],int,int,int,text[],text,double precision,double precision,int) from public, anon;
grant execute on function public.become_trainer(text,text[],int,int,int,text[],text,double precision,double precision,int) to authenticated;

create or replace function public.update_trainer_profile(
  p_specializations text[], p_experience_years int, p_fee_30 int, p_fee_60 int,
  p_languages text[], p_bio text, p_service_radius_km int
) returns public.trainers language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.trainers;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.trainers set
    specializations = coalesce(p_specializations, specializations),
    experience_years = greatest(coalesce(p_experience_years, experience_years), 0),
    fee_30 = greatest(coalesce(p_fee_30, fee_30), 0),
    fee_60 = greatest(coalesce(p_fee_60, fee_60), 0),
    languages = coalesce(p_languages, languages),
    bio = p_bio,
    service_radius_km = greatest(coalesce(p_service_radius_km, service_radius_km), 1)
  where user_id = v_uid returning * into v_t;
  if not found then raise exception 'you are not a trainer'; end if;
  return v_t;
end; $$;
revoke execute on function public.update_trainer_profile(text[],int,int,int,text[],text,int) from public, anon;
grant execute on function public.update_trainer_profile(text[],int,int,int,text[],text,int) to authenticated;

create or replace function public.set_trainer_availability(p_available boolean) returns public.trainers
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.trainers;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.trainers set available = coalesce(p_available, available) where user_id = v_uid returning * into v_t;
  if not found then raise exception 'you are not a trainer'; end if;
  return v_t;
end; $$;
revoke execute on function public.set_trainer_availability(boolean) from public, anon;
grant execute on function public.set_trainer_availability(boolean) to authenticated;

-- ---- trainer requests (matching) ----
create table if not exists public.trainer_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_id text references public.trainers(id),
  gym_id text, gym_name text, lat double precision, lng double precision,
  duration_mins int not null, fee int not null default 0, goal_note text,
  status text not null default 'searching' check (status in ('searching','assigned','unmatched','cancelled')),
  created_at timestamptz not null default now(), cutoff_at timestamptz, assigned_at timestamptz
);
create index if not exists trainer_requests_status_idx on public.trainer_requests (status, created_at);
alter table public.trainer_requests enable row level security;
drop policy if exists trainer_requests_member on public.trainer_requests;
drop policy if exists trainer_requests_trainer on public.trainer_requests;
create policy trainer_requests_member on public.trainer_requests for select to authenticated
  using (user_id = auth.uid());
-- A trainer sees requests assigned to them, or open ones they're eligible for
-- (verified + available + within their service radius). Goal/member name only — no phone.
create policy trainer_requests_trainer on public.trainer_requests for select to authenticated
  using (exists (
    select 1 from public.trainers t where t.user_id = auth.uid() and (
      t.id = trainer_requests.trainer_id
      or (trainer_requests.status = 'searching' and t.verified and t.available
          and (trainer_requests.lat is null or t.lat is null
               or public.haversine_km(t.lat, t.lng, trainer_requests.lat, trainer_requests.lng) <= t.service_radius_km))
    )
  ));

-- Member requests a trainer for a confirmed, trainer-less slot booking. Fee is the
-- accepting trainer's fee (recorded on accept), so nothing is captured up front.
create or replace function public.request_trainer(p_booking_id uuid, p_goal_note text default null)
returns public.trainer_requests language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_b public.bookings; v_g public.gyms; v_fee int; v_req public.trainer_requests;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_b from public.bookings where id = p_booking_id and user_id = v_uid;
  if not found then raise exception 'booking not found'; end if;
  if v_b.status <> 'Confirmed' or v_b.kind <> 'slot' then raise exception 'only upcoming slot bookings can request a trainer'; end if;
  if v_b.trainer_id is not null then raise exception 'this booking already has a trainer'; end if;
  if exists (select 1 from public.trainer_requests r where r.booking_id = p_booking_id and r.status in ('searching','assigned')) then
    raise exception 'a trainer request is already in progress for this booking';
  end if;
  select * into v_g from public.gyms where id = v_b.gym_id;
  -- indicative fee = average of eligible trainers' fee for the duration
  select round(avg(case when v_b.duration_mins = 30 then fee_30 else fee_60 end))::int into v_fee
    from public.trainers where verified and available and user_id is not null;
  insert into public.trainer_requests (booking_id,user_id,gym_id,gym_name,lat,lng,duration_mins,fee,goal_note,status,cutoff_at)
  values (p_booking_id, v_uid, v_b.gym_id, v_b.gym_name, v_g.lat, v_g.lng, v_b.duration_mins,
      coalesce(v_fee,0), nullif(trim(p_goal_note),''), 'searching',
      coalesce(v_b.starts_at - interval '2 hours', now() + interval '1 hour'))
  returning * into v_req;
  update public.bookings set trainer_status = 'Searching' where id = p_booking_id;
  begin
    perform public.enqueue_notification(v_uid, 'trainer_assigned', 'Finding a trainer',
      'We''re matching you with an available trainer for ' || v_b.title || '.',
      jsonb_build_object('bookingId', p_booking_id, 'requestId', v_req.id), v_req.id::text);
  exception when others then null; end;
  return v_req;
end; $$;
revoke execute on function public.request_trainer(uuid, text) from public, anon;
grant execute on function public.request_trainer(uuid, text) to authenticated;

-- Trainer accepts — atomic first-accept; later acceptances see "already taken".
create or replace function public.accept_trainer_request(p_request_id uuid)
returns public.trainer_requests language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.trainers; v_req public.trainer_requests; v_fee int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.trainers where user_id = v_uid;
  if not found then raise exception 'you are not a trainer'; end if;
  if not (v_t.verified and v_t.available) then raise exception 'set yourself available (and verified) to accept requests'; end if;
  update public.trainer_requests set status = 'assigned', trainer_id = v_t.id, assigned_at = now()
    where id = p_request_id and status = 'searching' returning * into v_req;
  if not found then raise exception 'this request is no longer available'; end if;
  v_fee := case when v_req.duration_mins = 30 then v_t.fee_30 else v_t.fee_60 end;
  update public.trainer_requests set fee = v_fee where id = v_req.id returning * into v_req;
  update public.bookings set trainer_id = v_t.id, trainer_name = v_t.name, trainer_status = 'Assigned',
    amount_paid = amount_paid + v_fee where id = v_req.booking_id;
  begin
    perform public.enqueue_notification(v_req.user_id, 'trainer_assigned', 'Trainer assigned 💪',
      v_t.name || ' will train you for your session.', jsonb_build_object('bookingId', v_req.booking_id), v_req.id::text);
  exception when others then null; end;
  return v_req;
end; $$;
revoke execute on function public.accept_trainer_request(uuid) from public, anon;
grant execute on function public.accept_trainer_request(uuid) to authenticated;

-- Member cancels an in-flight search.
create or replace function public.cancel_trainer_request(p_request_id uuid) returns public.trainer_requests
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_req public.trainer_requests;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.trainer_requests set status = 'cancelled'
    where id = p_request_id and user_id = v_uid and status = 'searching' returning * into v_req;
  if not found then raise exception 'request not found or already resolved'; end if;
  update public.bookings set trainer_status = null where id = v_req.booking_id and trainer_id is null;
  return v_req;
end; $$;
revoke execute on function public.cancel_trainer_request(uuid) from public, anon;
grant execute on function public.cancel_trainer_request(uuid) to authenticated;

-- Trainer backs out after accepting → re-broadcast + reliability hit (3 strikes → suspended).
create or replace function public.trainer_cancel_assignment(p_request_id uuid) returns public.trainer_requests
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_t public.trainers; v_req public.trainer_requests; v_strikes int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_t from public.trainers where user_id = v_uid;
  if not found then raise exception 'you are not a trainer'; end if;
  update public.trainer_requests set status = 'searching', trainer_id = null, assigned_at = null
    where id = p_request_id and trainer_id = v_t.id and status = 'assigned' returning * into v_req;
  if not found then raise exception 'assignment not found'; end if;
  -- undo the fee + reset the booking to searching
  update public.bookings set trainer_id = null, trainer_name = null, trainer_status = 'Searching',
    amount_paid = greatest(amount_paid - v_req.fee, 0) where id = v_req.booking_id;
  update public.trainers set cancelled_count = cancelled_count + 1 where id = v_t.id returning cancelled_count into v_strikes;
  if v_strikes >= 3 then update public.trainers set available = false where id = v_t.id; end if;
  begin
    perform public.enqueue_notification(v_req.user_id, 'trainer_unmatched', 'Trainer changed',
      'Your trainer had to step back — we''re finding you another one.', jsonb_build_object('bookingId', v_req.booking_id), v_req.id::text);
  exception when others then null; end;
  return v_req;
end; $$;
revoke execute on function public.trainer_cancel_assignment(uuid) from public, anon;
grant execute on function public.trainer_cancel_assignment(uuid) to authenticated;

-- Cutoff job: searching requests past cutoff → unmatched + notify (no fee was captured).
create or replace function public.expire_trainer_requests() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0;
begin
  for r in select * from public.trainer_requests where status = 'searching' and cutoff_at is not null and cutoff_at < now() for update skip locked
  loop
    update public.trainer_requests set status = 'unmatched' where id = r.id;
    update public.bookings set trainer_status = 'Unmatched' where id = r.booking_id and trainer_id is null;
    begin
      perform public.enqueue_notification(r.user_id, 'trainer_unmatched', 'No trainer available',
        'We couldn''t match a trainer in time — no fee was charged. You can still train solo.',
        jsonb_build_object('bookingId', r.booking_id), r.id::text);
    exception when others then null; end;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.expire_trainer_requests() from public, anon, authenticated;

do $$ begin perform cron.unschedule('gymslot-trainer-cutoff'); exception when others then null; end $$;
select cron.schedule('gymslot-trainer-cutoff', '*/5 * * * *', $cron$select public.expire_trainer_requests()$cron$);
