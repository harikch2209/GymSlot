-- 0008 — Notifications core (PRD Module 6).
-- Builds the dispatch core the rest of the PRD leans on: an in-app notification
-- feed (always works), per-category preferences, push-token registry, and a
-- 1-hour-before slot reminder driven by pg_cron. Booking confirmation (6.1),
-- gym-side new-booking alert (6.5), refund status (6.4) and slot reminders (6.2)
-- are wired here. Push (6.6) + SMS/WhatsApp (6.7) ship as code-complete but
-- inert delivery: notifications are tagged with the channels they *should* reach,
-- and an optional pg_net worker posts them to the send-notification Edge Function
-- once credentials are configured (mirrors the create-payment-order pattern).

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  reference text,                                  -- e.g. booking id, for deep-linking
  channels text[] not null default array['in_app'],
  status text not null default 'sent' check (status in ('queued','sent','failed','read')),
  dispatched_at timestamptz,                       -- when outbound (push/sms) was attempted
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
-- Read your own; all writes happen through SECURITY DEFINER RPCs below.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  booking   boolean not null default true,   -- confirmations / cancellations
  reminders boolean not null default true,   -- slot + event reminders, credit expiry
  trainer   boolean not null default true,   -- trainer matched / unmatched
  refunds   boolean not null default true,   -- refund status
  events    boolean not null default true,   -- nearby event promos
  partner   boolean not null default true,   -- gym-side new-booking alerts
  push_enabled boolean not null default true,
  sms_enabled  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_select_own on public.notification_prefs;
create policy notification_prefs_select_own on public.notification_prefs
  for select using (user_id = auth.uid());

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select using (user_id = auth.uid());

-- Dedupe column so a reminder is only sent once per booking.
alter table public.bookings add column if not exists reminded_at timestamptz;

-- =========================================================================
-- Core: category mapping + enqueue (internal — called by other definers)
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
    when 'event_nearby'         then 'events'
    else 'booking' end;
$$;

-- Records one notification, honouring the recipient's category prefs and
-- tagging the channels it should reach (push/sms only if enabled + reachable).
-- Returns the new id, or null if suppressed by prefs. Never raises.
create or replace function public.enqueue_notification(
  p_user_id uuid, p_type text, p_title text, p_body text,
  p_data jsonb default '{}'::jsonb, p_reference text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cat text := public.notif_category(p_type);
  v_prefs public.notification_prefs;
  v_enabled boolean := true;
  v_push boolean := true; v_sms boolean := false;
  v_channels text[] := array['in_app'];
  v_has_token boolean; v_phone text;
  v_id uuid; v_dispatched timestamptz;
begin
  if p_user_id is null then return null; end if;
  select * into v_prefs from public.notification_prefs where user_id = p_user_id;
  if found then
    v_enabled := case v_cat
      when 'booking'   then v_prefs.booking
      when 'reminders' then v_prefs.reminders
      when 'trainer'   then v_prefs.trainer
      when 'refunds'   then v_prefs.refunds
      when 'events'    then v_prefs.events
      when 'partner'   then v_prefs.partner
      else true end;
    v_push := coalesce(v_prefs.push_enabled, true);
    v_sms  := coalesce(v_prefs.sms_enabled, false);
  end if;
  if not v_enabled then return null; end if;

  if v_push then
    select exists(select 1 from public.push_tokens t where t.user_id = p_user_id) into v_has_token;
    if v_has_token then v_channels := v_channels || 'push'; end if;
  end if;
  if v_sms then
    select phone into v_phone from public.profiles where id = p_user_id;
    if v_phone is not null and length(v_phone) > 0 then v_channels := v_channels || 'sms'; end if;
  end if;

  -- in-app is delivered the instant it's recorded; only mark "pending dispatch"
  -- when there's an outbound channel for the worker to flush.
  v_dispatched := case when array_length(v_channels, 1) = 1 then now() else null end;

  insert into public.notifications (user_id, type, title, body, data, reference, channels, status, dispatched_at)
  values (p_user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb), p_reference, v_channels, 'sent', v_dispatched)
  returning id into v_id;
  return v_id;
end; $$;
revoke execute on function public.enqueue_notification(uuid,text,text,text,jsonb,text) from public, anon, authenticated;

-- =========================================================================
-- Client RPCs (authenticated)
-- =========================================================================

create or replace function public.mark_notification_read(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.notifications set status = 'read', read_at = now()
    where id = p_id and user_id = v_uid and status <> 'read';
  get diagnostics v_n = row_count;
  return v_n > 0;
end; $$;
revoke execute on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read() returns int
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.notifications set status = 'read', read_at = now()
    where user_id = v_uid and status <> 'read';
  get diagnostics v_n = row_count;
  return v_n;
end; $$;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.unread_notification_count() returns int
language sql security definer set search_path = public as $$
  select count(*)::int from public.notifications
  where user_id = auth.uid() and status <> 'read';
$$;
revoke execute on function public.unread_notification_count() from public, anon;
grant execute on function public.unread_notification_count() to authenticated;

-- Returns the caller's prefs, creating a default row on first read.
create or replace function public.get_notification_prefs() returns public.notification_prefs
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_prefs public.notification_prefs;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.notification_prefs (user_id) values (v_uid)
    on conflict (user_id) do nothing;
  select * into v_prefs from public.notification_prefs where user_id = v_uid;
  return v_prefs;
end; $$;
revoke execute on function public.get_notification_prefs() from public, anon;
grant execute on function public.get_notification_prefs() to authenticated;

create or replace function public.set_notification_pref(p_key text, p_value boolean) returns public.notification_prefs
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_prefs public.notification_prefs;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_key not in ('booking','reminders','trainer','refunds','events','partner','push_enabled','sms_enabled') then
    raise exception 'unknown preference: %', p_key;
  end if;
  insert into public.notification_prefs (user_id) values (v_uid) on conflict (user_id) do nothing;
  execute format('update public.notification_prefs set %I = $1, updated_at = now() where user_id = $2', p_key)
    using p_value, v_uid;
  select * into v_prefs from public.notification_prefs where user_id = v_uid;
  return v_prefs;
end; $$;
revoke execute on function public.set_notification_pref(text, boolean) from public, anon;
grant execute on function public.set_notification_pref(text, boolean) to authenticated;

create or replace function public.register_push_token(p_token text, p_platform text default 'unknown') returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_token is null or length(p_token) < 8 then raise exception 'invalid push token'; end if;
  insert into public.push_tokens (user_id, token, platform, updated_at)
  values (v_uid, p_token, coalesce(p_platform, 'unknown'), now())
  on conflict (user_id, token) do update set platform = excluded.platform, updated_at = now();
end; $$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

create or replace function public.unregister_push_token(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  delete from public.push_tokens where user_id = v_uid and token = p_token;
end; $$;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- =========================================================================
-- Wire booking lifecycle → notifications (replaces deployed bodies verbatim,
-- adding only the fire-and-forget notify hooks; a failure here never aborts
-- the booking/cancel).
-- =========================================================================

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
  v_code text; v_ends timestamptz; v_owner record;
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

  -- Notifications: confirm to the member, alert the gym's owners. Never blocks.
  begin
    perform public.enqueue_notification(v_uid, 'booking_confirmation',
      'Booking confirmed',
      p_title || ' · ' || p_gym_name || ' · ' || p_booking_date || ' ' || p_time,
      jsonb_build_object('bookingId', v_booking.id, 'kind', p_kind, 'gymId', p_gym_id),
      v_booking.id::text);
    for v_owner in select user_id from public.gym_owners where gym_id = p_gym_id loop
      perform public.enqueue_notification(v_owner.user_id, 'gym_new_booking',
        'New booking',
        coalesce(v_member,'A member') || ' booked ' || p_title || ' · ' || p_booking_date || ' ' || p_time,
        jsonb_build_object('bookingId', v_booking.id, 'gymId', p_gym_id),
        v_booking.id::text);
    end loop;
  exception when others then null;
  end;

  return v_booking;
end; $$;
revoke execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.create_booking(text,text,text,text,text,text,int,int,int,text,text,text,text,timestamptz) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid, p_as_credits boolean)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_bonus int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_booking from public.bookings
    where id = p_booking_id and user_id = v_uid for update;
  if not found then raise exception 'booking not found'; end if;
  if v_booking.status <> 'Confirmed' then raise exception 'only confirmed bookings can be cancelled'; end if;

  update public.bookings set status = 'Cancelled' where id = p_booking_id returning * into v_booking;

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

  -- Refund-status notification (never blocks the cancel).
  begin
    perform public.enqueue_notification(v_uid, 'refund_status',
      case when p_as_credits and v_booking.amount_paid > 0 then 'Refunded to credits (+5% bonus)'
           when v_booking.amount_paid > 0 then 'Refund initiated'
           else 'Booking cancelled' end,
      'Your booking "' || v_booking.title || '" was cancelled.' ||
        case when p_as_credits and v_booking.amount_paid > 0
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

-- =========================================================================
-- Scheduled: slot reminders ~1h before (PRD 6.2). Idempotent via reminded_at.
-- =========================================================================

create or replace function public.dispatch_due_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0;
begin
  for r in
    select * from public.bookings
    where status = 'Confirmed' and starts_at is not null and reminded_at is null
      and starts_at between now() + interval '50 minutes' and now() + interval '70 minutes'
    for update skip locked
  loop
    perform public.enqueue_notification(r.user_id, 'slot_reminder',
      'Your session is in about an hour',
      r.title || ' · ' || r.gym_name || ' · ' || to_char(r.starts_at at time zone 'Asia/Kolkata', 'HH12:MI AM'),
      jsonb_build_object('bookingId', r.id, 'gymId', r.gym_id),
      r.id::text);
    update public.bookings set reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.dispatch_due_reminders() from public, anon, authenticated;

-- =========================================================================
-- Optional outbound delivery worker (push/SMS). Inert until BOTH pg_net is
-- enabled AND the two Vault secrets are set — until then in-app still works.
-- To activate (needs-creds):
--   create extension if not exists pg_net;
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-notification', 'notify_fn_url');
--   select vault.create_secret('<service_role_key>', 'notify_service_key');
--   select cron.schedule('gymslot-flush-notifications', '* * * * *',
--                        $cron$select public.flush_outbound_notifications()$cron$);
-- =========================================================================

create or replace function public.flush_outbound_notifications() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_url text; v_key text; v_count int := 0;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return 0; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_fn_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'notify_service_key';
  if v_url is null or v_key is null then return 0; end if;

  for r in
    select id from public.notifications
    where dispatched_at is null and created_at > now() - interval '1 day'
      and (channels && array['push','sms'])
    order by created_at limit 50
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object('notification_id', r.id)
    );
    update public.notifications set dispatched_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.flush_outbound_notifications() from public, anon, authenticated;

-- Realtime + the pg_cron reminder schedule are applied in 0008b (isolated so the
-- core DDL above lands even if the cron extension needs separate enablement).
