-- 0009 — Partner onboarding & management (PRD Module 3).
-- Self-serve gym registration with an admin verification gate (3.1, 3-AC2),
-- owner-scoped slot + blackout config (3.2), KYC/bank capture, and a cash
-- settlement read-model (3.3/3.4 partial; weekly statements + Razorpay Route
-- payouts remain needs-creds). All writes go through SECURITY DEFINER RPCs;
-- gyms become readable to the public ONLY when status = 'verified'.

-- =========================================================================
-- Schema
-- =========================================================================

alter table public.gyms add column if not exists status text not null default 'verified'
  check (status in ('draft','pending','verified','rejected'));
alter table public.gyms add column if not exists submitted_at timestamptz;
alter table public.gyms add column if not exists verified_at timestamptz;
alter table public.gyms add column if not exists rejection_reason text;

-- KYC / bank details (sensitive — owner-read only, written via RPC).
create table if not exists public.gym_kyc (
  gym_id text primary key references public.gyms(id) on delete cascade,
  legal_name text,
  pan text,
  gstin text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gym_kyc enable row level security;
drop policy if exists gym_kyc_owner_read on public.gym_kyc;
create policy gym_kyc_owner_read on public.gym_kyc for select to authenticated
  using (exists (select 1 from public.gym_owners o where o.gym_id = gym_kyc.gym_id and o.user_id = auth.uid()));

-- Verification reviewers. Membership is NOT user-writable (no insert/update
-- policy) so users cannot self-promote; managed via SQL/service role.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists app_admins_self on public.app_admins;
create policy app_admins_self on public.app_admins for select to authenticated using (user_id = auth.uid());
-- Demo: let existing partner accounts also act as the verification reviewer.
insert into public.app_admins (user_id) select distinct user_id from public.gym_owners on conflict do nothing;

-- =========================================================================
-- gyms RLS: public sees verified only; owners + admins see their own/all
-- (replaces the previous read-all policy → closes 3-AC2).
-- =========================================================================

drop policy if exists gyms_read on public.gyms;
drop policy if exists gyms_read_public on public.gyms;
drop policy if exists gyms_read_manage on public.gyms;
create policy gyms_read_public on public.gyms for select to anon, authenticated
  using (status = 'verified');
create policy gyms_read_manage on public.gyms for select to authenticated
  using (
    exists (select 1 from public.gym_owners o where o.gym_id = gyms.id and o.user_id = auth.uid())
    or exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

-- =========================================================================
-- notif_category: route gym verification updates to the 'partner' bucket.
-- =========================================================================

create or replace function public.notif_category(p_type text) returns text
language sql immutable set search_path = '' as $$
  select case p_type
    when 'booking_confirmation' then 'booking'
    when 'booking_cancelled'    then 'booking'
    when 'refund_status'        then 'refunds'
    when 'slot_reminder'        then 'reminders'
    when 'event_reminder'       then 'reminders'
    when 'credit_expiry'        then 'reminders'
    when 'trainer_assigned'     then 'trainer'
    when 'trainer_unmatched'    then 'trainer'
    when 'gym_new_booking'      then 'partner'
    when 'gym_status'           then 'partner'
    when 'event_nearby'         then 'events'
    else 'booking' end;
$$;

-- =========================================================================
-- Helper: ownership check (internal)
-- =========================================================================

create or replace function public.owns_gym(p_gym_id text, p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gym_owners o where o.gym_id = p_gym_id and o.user_id = p_uid);
$$;
revoke execute on function public.owns_gym(text, uuid) from public, anon, authenticated;

-- =========================================================================
-- Gym lifecycle RPCs
-- =========================================================================

-- Self-serve registration: creates a 'pending' gym owned by the caller, plus
-- any initial slots (jsonb array of {time,duration,price,capacity,peak}).
create or replace function public.create_gym(
  p_name text, p_area text default '', p_city text default 'Bengaluru',
  p_lat double precision default null, p_lng double precision default null,
  p_price_from int default 0, p_amenities text[] default '{}',
  p_about text default null, p_timings text default null,
  p_image_url text default null, p_images text[] default '{}',
  p_effective_capacity int default 40, p_slots jsonb default '[]'::jsonb
) returns public.gyms language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_id text; v_gym public.gyms; v_slot jsonb; v_i int := 0; v_min_price int; v_dur int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'gym name is required'; end if;
  v_id := 'g_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  select min((s->>'price')::int) into v_min_price
    from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s;

  insert into public.gyms (id,name,area,city,lat,lng,price_from,amenities,about,timings,image_url,images,
      effective_capacity,status,submitted_at,rating,reviews,crowd,crowd_updated_at)
  values (v_id, p_name, coalesce(p_area,''), coalesce(p_city,'Bengaluru'), p_lat, p_lng,
      greatest(coalesce(v_min_price, p_price_from, 0), 0), coalesce(p_amenities,'{}'), p_about, p_timings,
      p_image_url, coalesce(p_images,'{}'), greatest(coalesce(p_effective_capacity,40),1),
      'pending', now(), 0, 0, 'Unknown', now())
  returning * into v_gym;

  insert into public.gym_owners (gym_id, user_id) values (v_id, v_uid) on conflict do nothing;

  for v_slot in select * from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) loop
    v_dur := coalesce((v_slot->>'duration')::int, 60);
    if v_dur not in (30, 60) then v_dur := 60; end if;
    insert into public.slots (id, gym_id, time, duration, price, capacity, peak, sort_order)
    values ('s_'||substr(replace(gen_random_uuid()::text,'-',''),1,16), v_id,
      coalesce(nullif(trim(v_slot->>'time'),''), '6:00 AM'), v_dur,
      greatest(coalesce((v_slot->>'price')::int, 0), 0),
      greatest(coalesce((v_slot->>'capacity')::int, 12), 1),
      coalesce((v_slot->>'peak')::boolean, false), v_i);
    v_i := v_i + 1;
  end loop;

  return v_gym;
end; $$;
revoke execute on function public.create_gym(text,text,text,double precision,double precision,int,text[],text,text,text,text[],int,jsonb) from public, anon;
grant execute on function public.create_gym(text,text,text,double precision,double precision,int,text[],text,text,text,text[],int,jsonb) to authenticated;

-- Edit a gym you own (does not change verification status).
create or replace function public.update_gym(
  p_gym_id text, p_name text, p_area text, p_city text,
  p_lat double precision, p_lng double precision, p_price_from int,
  p_amenities text[], p_about text, p_timings text, p_image_url text, p_images text[], p_effective_capacity int
) returns public.gyms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym public.gyms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  update public.gyms set
    name = coalesce(nullif(trim(p_name),''), name),
    area = coalesce(p_area, area),
    city = coalesce(nullif(trim(p_city),''), city),
    lat = p_lat, lng = p_lng,
    price_from = greatest(coalesce(p_price_from, price_from), 0),
    amenities = coalesce(p_amenities, amenities),
    about = p_about, timings = p_timings, image_url = p_image_url,
    images = coalesce(p_images, images),
    effective_capacity = greatest(coalesce(p_effective_capacity, effective_capacity), 1)
  where id = p_gym_id returning * into v_gym;
  return v_gym;
end; $$;
revoke execute on function public.update_gym(text,text,text,text,double precision,double precision,int,text[],text,text,text,text[],int) from public, anon;
grant execute on function public.update_gym(text,text,text,text,double precision,double precision,int,text[],text,text,text,text[],int) to authenticated;

-- Submit a draft/rejected/pending gym for (re)review.
create or replace function public.submit_gym_for_review(p_gym_id text) returns public.gyms
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym public.gyms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  update public.gyms set status = 'pending', submitted_at = now(), rejection_reason = null
    where id = p_gym_id and status in ('draft','rejected','pending') returning * into v_gym;
  if not found then raise exception 'this gym is already live or cannot be submitted'; end if;
  return v_gym;
end; $$;
revoke execute on function public.submit_gym_for_review(text) from public, anon;
grant execute on function public.submit_gym_for_review(text) to authenticated;

-- Admin approve/reject (gated to app_admins). Notifies the gym's owners.
create or replace function public.verify_gym(p_gym_id text, p_approve boolean, p_reason text default null)
returns public.gyms language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym public.gyms; v_owner record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.app_admins a where a.user_id = v_uid) then
    raise exception 'admin only';
  end if;
  if p_approve then
    update public.gyms set status = 'verified', verified_at = now(), rejection_reason = null
      where id = p_gym_id returning * into v_gym;
  else
    update public.gyms set status = 'rejected', rejection_reason = coalesce(nullif(trim(p_reason),''), 'Not approved')
      where id = p_gym_id returning * into v_gym;
  end if;
  if not found then raise exception 'gym not found'; end if;
  begin
    for v_owner in select user_id from public.gym_owners where gym_id = p_gym_id loop
      perform public.enqueue_notification(v_owner.user_id, 'gym_status',
        case when p_approve then 'Your gym is live 🎉' else 'Gym needs changes' end,
        case when p_approve then v_gym.name || ' has been verified and is now discoverable.'
             else v_gym.name || ' was not approved: ' || coalesce(v_gym.rejection_reason,'see details') end,
        jsonb_build_object('gymId', p_gym_id, 'status', v_gym.status), p_gym_id);
    end loop;
  exception when others then null;
  end;
  return v_gym;
end; $$;
revoke execute on function public.verify_gym(text, boolean, text) from public, anon;
grant execute on function public.verify_gym(text, boolean, text) to authenticated;

-- KYC / bank details upsert (owner only).
create or replace function public.upsert_gym_kyc(
  p_gym_id text, p_legal_name text, p_pan text, p_gstin text,
  p_bank_account_name text, p_bank_account_number text, p_bank_ifsc text
) returns public.gym_kyc language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_kyc public.gym_kyc;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  insert into public.gym_kyc (gym_id,legal_name,pan,gstin,bank_account_name,bank_account_number,bank_ifsc,updated_at)
  values (p_gym_id,p_legal_name,p_pan,p_gstin,p_bank_account_name,p_bank_account_number,p_bank_ifsc,now())
  on conflict (gym_id) do update set
    legal_name = excluded.legal_name, pan = excluded.pan, gstin = excluded.gstin,
    bank_account_name = excluded.bank_account_name, bank_account_number = excluded.bank_account_number,
    bank_ifsc = excluded.bank_ifsc, updated_at = now()
  returning * into v_kyc;
  return v_kyc;
end; $$;
revoke execute on function public.upsert_gym_kyc(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.upsert_gym_kyc(text,text,text,text,text,text,text) to authenticated;

-- =========================================================================
-- Slot config RPCs (3.2)
-- =========================================================================

create or replace function public.create_slot(
  p_gym_id text, p_time text, p_duration int, p_price int, p_capacity int, p_peak boolean default false
) returns public.slots language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_slot public.slots; v_order int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  if coalesce(p_duration,0) not in (30,60) then raise exception 'duration must be 30 or 60 minutes'; end if;
  if coalesce(nullif(trim(p_time),''), '') = '' then raise exception 'slot time is required'; end if;
  select coalesce(max(sort_order),-1)+1 into v_order from public.slots where gym_id = p_gym_id;
  insert into public.slots (id,gym_id,time,duration,price,capacity,peak,sort_order)
  values ('s_'||substr(replace(gen_random_uuid()::text,'-',''),1,16), p_gym_id, trim(p_time), p_duration,
    greatest(coalesce(p_price,0),0), greatest(coalesce(p_capacity,12),1), coalesce(p_peak,false), v_order)
  returning * into v_slot;
  return v_slot;
end; $$;
revoke execute on function public.create_slot(text,text,int,int,int,boolean) from public, anon;
grant execute on function public.create_slot(text,text,int,int,int,boolean) to authenticated;

create or replace function public.update_slot(
  p_slot_id text, p_time text, p_duration int, p_price int, p_capacity int, p_peak boolean
) returns public.slots language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_slot public.slots; v_gym text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.slots where id = p_slot_id;
  if v_gym is null then raise exception 'slot not found'; end if;
  if not public.owns_gym(v_gym, v_uid) then raise exception 'you do not manage this gym'; end if;
  if coalesce(p_duration,0) not in (30,60) then raise exception 'duration must be 30 or 60 minutes'; end if;
  update public.slots set
    time = coalesce(nullif(trim(p_time),''), time),
    duration = p_duration,
    price = greatest(coalesce(p_price, price), 0),
    capacity = greatest(coalesce(p_capacity, capacity), 1),
    peak = coalesce(p_peak, peak)
  where id = p_slot_id returning * into v_slot;
  return v_slot;
end; $$;
revoke execute on function public.update_slot(text,text,int,int,int,boolean) from public, anon;
grant execute on function public.update_slot(text,text,int,int,int,boolean) to authenticated;

create or replace function public.delete_slot(p_slot_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.slots where id = p_slot_id;
  if v_gym is null then raise exception 'slot not found'; end if;
  if not public.owns_gym(v_gym, v_uid) then raise exception 'you do not manage this gym'; end if;
  delete from public.gym_blackouts where slot_id = p_slot_id;  -- FK dependents
  delete from public.slots where id = p_slot_id;
end; $$;
revoke execute on function public.delete_slot(text) from public, anon;
grant execute on function public.delete_slot(text) to authenticated;

-- =========================================================================
-- Blackout dates (3.2 / "block slots for maintenance/holidays")
-- =========================================================================

create or replace function public.add_blackout(
  p_gym_id text, p_date text, p_slot_id text default null, p_reason text default null
) returns public.gym_blackouts language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.gym_blackouts;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  if coalesce(nullif(trim(p_date),''),'') = '' then raise exception 'date is required'; end if;
  if p_slot_id is not null and not exists (select 1 from public.slots s where s.id = p_slot_id and s.gym_id = p_gym_id) then
    raise exception 'slot does not belong to this gym';
  end if;
  insert into public.gym_blackouts (gym_id, blackout_date, slot_id, reason)
  values (p_gym_id, trim(p_date), p_slot_id, p_reason) returning * into v_row;
  return v_row;
end; $$;
revoke execute on function public.add_blackout(text,text,text,text) from public, anon;
grant execute on function public.add_blackout(text,text,text,text) to authenticated;

create or replace function public.remove_blackout(p_blackout_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.gym_blackouts where id = p_blackout_id;
  if v_gym is null then raise exception 'blackout not found'; end if;
  if not public.owns_gym(v_gym, v_uid) then raise exception 'you do not manage this gym'; end if;
  delete from public.gym_blackouts where id = p_blackout_id;
end; $$;
revoke execute on function public.remove_blackout(uuid) from public, anon;
grant execute on function public.remove_blackout(uuid) to authenticated;

-- =========================================================================
-- Settlement read-model (3.3/3.4): real cash collected via Razorpay for the
-- caller's gyms. Weekly statements + Route transfers remain needs-creds.
-- =========================================================================

create or replace function public.partner_settlement()
returns table (gross bigint, commission bigint, payout bigint, sessions bigint)
language sql security definer set search_path = public as $$
  select
    coalesce(sum(p.amount), 0)::bigint as gross,
    coalesce(sum(p.commission), 0)::bigint as commission,
    coalesce(sum(p.gym_payout), 0)::bigint as payout,
    count(*)::bigint as sessions
  from public.payments p
  where p.status = 'paid'
    and p.gym_id in (select gym_id from public.gym_owners where user_id = auth.uid());
$$;
revoke execute on function public.partner_settlement() from public, anon;
grant execute on function public.partner_settlement() to authenticated;
