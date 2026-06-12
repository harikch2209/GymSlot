-- 0012 — Gym events lifecycle (PRD Module 8).
-- Partner-side create / edit-until-first-reservation / cancel-with-auto-refund
-- (8.1, 8-AC1, 8-AC5), a verification-gated publish, and post-event analytics
-- (8.4 / 8-AC6: reservations vs attendance + new-to-gym). All writes through
-- SECURITY DEFINER RPCs; the public sees only published events at verified gyms.

alter table public.events add column if not exists status text not null default 'published'
  check (status in ('draft','published','cancelled'));
alter table public.events add column if not exists created_by uuid references auth.users(id);
alter table public.events add column if not exists cancelled_at timestamptz;

-- RLS: public sees published events at verified gyms; owners/admins see their own.
drop policy if exists events_read on public.events;
drop policy if exists events_read_public on public.events;
drop policy if exists events_read_manage on public.events;
create policy events_read_public on public.events for select to anon, authenticated
  using (status = 'published'
    and (gym_id is null or exists (select 1 from public.gyms g where g.id = events.gym_id and g.status = 'verified')));
create policy events_read_manage on public.events for select to authenticated
  using (gym_id is not null and (
    exists (select 1 from public.gym_owners o where o.gym_id = events.gym_id and o.user_id = auth.uid())
    or exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  ));

-- ---- create (publish) an event for a gym you own ----
create or replace function public.create_event(
  p_gym_id text, p_title text, p_category text, p_description text,
  p_event_date text, p_event_time text, p_duration_mins int, p_capacity int,
  p_price int default 0, p_image_url text default null, p_what_to_bring text default null
) returns public.events language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id text; v_ev public.events; v_gym public.gyms;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not public.owns_gym(p_gym_id, v_uid) then raise exception 'you do not manage this gym'; end if;
  select * into v_gym from public.gyms where id = p_gym_id;
  if v_gym.status is distinct from 'verified' then raise exception 'verify your gym before publishing events'; end if;
  if coalesce(trim(p_title),'') = '' then raise exception 'event title is required'; end if;
  v_id := 'e_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  insert into public.events (id,gym_id,gym_name,title,category,description,event_date,event_time,
      duration_mins,capacity,price,image_url,what_to_bring,status,created_by,reserved_seed)
  values (v_id, p_gym_id, v_gym.name, p_title, coalesce(nullif(trim(p_category),''),'Workshop'), p_description,
      coalesce(p_event_date,''), coalesce(p_event_time,''), greatest(coalesce(p_duration_mins,60),1),
      greatest(coalesce(p_capacity,20),1), greatest(coalesce(p_price,0),0), p_image_url, p_what_to_bring,
      'published', v_uid, 0)
  returning * into v_ev;
  return v_ev;
end; $$;
revoke execute on function public.create_event(text,text,text,text,text,text,int,int,int,text,text) from public, anon;
grant execute on function public.create_event(text,text,text,text,text,text,int,int,int,text,text) to authenticated;

-- ---- edit an event, allowed only until its first reservation (PRD 8.1) ----
create or replace function public.update_event(
  p_event_id text, p_title text, p_category text, p_description text,
  p_event_date text, p_event_time text, p_duration_mins int, p_capacity int,
  p_price int, p_image_url text, p_what_to_bring text
) returns public.events language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ev public.events; v_gym text; v_reserved int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.events where id = p_event_id;
  if v_gym is null then raise exception 'event not found'; end if;
  if not public.owns_gym(v_gym, v_uid) then raise exception 'you do not manage this gym'; end if;
  select count(*) into v_reserved from public.bookings where event_id = p_event_id and status in ('Confirmed','Completed');
  if v_reserved > 0 then raise exception 'this event already has reservations and can no longer be edited'; end if;
  update public.events set
    title = coalesce(nullif(trim(p_title),''), title),
    category = coalesce(nullif(trim(p_category),''), category),
    description = p_description,
    event_date = coalesce(p_event_date, event_date),
    event_time = coalesce(p_event_time, event_time),
    duration_mins = greatest(coalesce(p_duration_mins, duration_mins), 1),
    capacity = greatest(coalesce(p_capacity, capacity), 1),
    price = greatest(coalesce(p_price, price), 0),
    image_url = p_image_url, what_to_bring = p_what_to_bring
  where id = p_event_id returning * into v_ev;
  return v_ev;
end; $$;
revoke execute on function public.update_event(text,text,text,text,text,text,int,int,int,text,text) from public, anon;
grant execute on function public.update_event(text,text,text,text,text,text,int,int,int,text,text) to authenticated;

-- ---- cancel an event: auto-refund every attendee (as credits) + notify (8-AC5) ----
create or replace function public.cancel_event(p_event_id text) returns public.events
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ev public.events; v_gym text; b record; v_refund int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.events where id = p_event_id;
  if v_gym is null then raise exception 'event not found'; end if;
  if not (public.owns_gym(v_gym, v_uid) or exists (select 1 from public.app_admins a where a.user_id = v_uid)) then
    raise exception 'you do not manage this gym';
  end if;
  update public.events set status = 'cancelled', cancelled_at = now() where id = p_event_id returning * into v_ev;
  for b in select * from public.bookings where event_id = p_event_id and status = 'Confirmed' loop
    update public.bookings set status = 'Cancelled' where id = b.id;
    v_refund := coalesce(b.amount_paid,0) + coalesce(b.credits_used,0);
    if v_refund > 0 then
      insert into public.credit_ledger (user_id, amount, reason, label, reference)
      values (b.user_id, v_refund, 'refund', 'Event cancelled — ' || v_ev.title, b.id::text);
    end if;
    begin
      perform public.enqueue_notification(b.user_id, 'refund_status', 'Event cancelled',
        v_ev.title || ' was cancelled by the gym.' ||
          case when v_refund > 0 then ' ₹' || v_refund::text || ' added to your wallet.' else '' end,
        jsonb_build_object('eventId', p_event_id, 'bookingId', b.id), b.id::text);
    exception when others then null; end;
  end loop;
  return v_ev;
end; $$;
revoke execute on function public.cancel_event(text) from public, anon;
grant execute on function public.cancel_event(text) to authenticated;

-- ---- post-event analytics: reservations vs attendance + new-to-gym (8.4/8-AC6) ----
create or replace function public.event_analytics(p_event_id text)
returns table (reservations bigint, attended bigint, new_to_gym bigint, revenue bigint)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gym text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select gym_id into v_gym from public.events where id = p_event_id;
  if v_gym is null then
    if not exists (select 1 from public.app_admins a where a.user_id = v_uid) then raise exception 'not allowed'; end if;
  elsif not (public.owns_gym(v_gym, v_uid) or exists (select 1 from public.app_admins a where a.user_id = v_uid)) then
    raise exception 'you do not manage this gym';
  end if;
  return query
  with eb as (
    select * from public.bookings where event_id = p_event_id and status in ('Confirmed','Completed')
  )
  select
    (select count(*) from eb)::bigint,
    (select count(*) from eb where checked_in)::bigint,
    (select count(*) from eb where v_gym is not null and not exists (
        select 1 from public.bookings b2
        where b2.user_id = eb.user_id and b2.gym_id = v_gym and b2.created_at < eb.created_at
     ))::bigint,
    (select coalesce(sum(amount_paid),0) from eb)::bigint;
end; $$;
revoke execute on function public.event_analytics(text) from public, anon;
grant execute on function public.event_analytics(text) to authenticated;
