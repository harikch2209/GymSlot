-- 0011 — Trust, ratings & support (PRD Module 5).
-- Gym review tags (5.2), trainer ratings + tags (5.3), and a report/flag flow
-- with admin support escalation (5.4/5.5). Help center (5.6) + WhatsApp (5.7)
-- are client-only. All writes go through SECURITY DEFINER RPCs.

-- =========================================================================
-- 5.2 — gym review tags
-- =========================================================================

alter table public.reviews add column if not exists tags text[] not null default '{}';

drop function if exists public.submit_review(text, integer, text);
create or replace function public.submit_review(
  p_gym_id text, p_rating int, p_comment text default null, p_tags text[] default '{}'
) returns public.reviews language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_name text; v_review public.reviews; v_tags text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be between 1 and 5'; end if;
  if not exists (select 1 from public.bookings where user_id = v_uid and gym_id = p_gym_id) then
    raise exception 'you can only review a gym you have booked';
  end if;
  select coalesce(array_agg(distinct t), '{}') into v_tags
    from unnest(coalesce(p_tags, '{}')) t
    where t in ('Clean','Great equipment','Crowd accurate','Friendly staff','Good value','Crowded','Needs upkeep');
  select coalesce(full_name, 'GymSlot member') into v_name from public.profiles where id = v_uid;
  insert into public.reviews (gym_id, user_id, reviewer_name, rating, comment, tags)
  values (p_gym_id, v_uid, coalesce(v_name, 'GymSlot member'), p_rating, nullif(trim(p_comment), ''), v_tags)
  on conflict (gym_id, user_id) where user_id is not null
    do update set rating = excluded.rating, comment = excluded.comment, tags = excluded.tags, created_at = now()
  returning * into v_review;
  return v_review;
end; $$;
revoke execute on function public.submit_review(text,int,text,text[]) from public, anon;
grant execute on function public.submit_review(text,int,text,text[]) to authenticated;

-- =========================================================================
-- 5.3 — trainer ratings + tags (gated to a completed session with the trainer)
-- =========================================================================

create table if not exists public.trainer_reviews (
  id uuid primary key default gen_random_uuid(),
  trainer_id text not null references public.trainers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (trainer_id, user_id)
);
alter table public.trainer_reviews enable row level security;
drop policy if exists trainer_reviews_read on public.trainer_reviews;
create policy trainer_reviews_read on public.trainer_reviews for select using (true);

create or replace function public.submit_trainer_review(
  p_trainer_id text, p_rating int, p_comment text default null, p_tags text[] default '{}'
) returns public.trainer_reviews language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_name text; v_row public.trainer_reviews; v_tags text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be between 1 and 5'; end if;
  if not exists (
    select 1 from public.bookings
    where user_id = v_uid and trainer_id = p_trainer_id and status = 'Completed'
  ) then raise exception 'you can only review a trainer after a completed session'; end if;
  select coalesce(array_agg(distinct t), '{}') into v_tags
    from unnest(coalesce(p_tags, '{}')) t
    where t in ('Punctual','Knowledgeable','Motivating','Professional','Late','Unprepared');
  select coalesce(full_name, 'GymSlot member') into v_name from public.profiles where id = v_uid;
  insert into public.trainer_reviews (trainer_id, user_id, reviewer_name, rating, comment, tags)
  values (p_trainer_id, v_uid, coalesce(v_name, 'GymSlot member'), p_rating, nullif(trim(p_comment), ''), v_tags)
  on conflict (trainer_id, user_id) do update set
    rating = excluded.rating, comment = excluded.comment, tags = excluded.tags, created_at = now()
  returning * into v_row;
  return v_row;
end; $$;
revoke execute on function public.submit_trainer_review(text,int,text,text[]) from public, anon;
grant execute on function public.submit_trainer_review(text,int,text,text[]) to authenticated;

-- =========================================================================
-- 5.4 / 5.5 — reports/flags + admin support escalation
-- =========================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('gym','trainer','booking','event','user')),
  subject_id text,
  subject_label text,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
drop policy if exists reports_select_own on public.reports;
drop policy if exists reports_select_admin on public.reports;
create policy reports_select_own on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy reports_select_admin on public.reports for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create or replace function public.submit_report(
  p_subject_type text, p_subject_id text, p_subject_label text, p_reason text, p_details text default null
) returns public.reports language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.reports; v_admin record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_subject_type not in ('gym','trainer','booking','event','user') then raise exception 'invalid report subject'; end if;
  if coalesce(nullif(trim(p_reason),''),'') = '' then raise exception 'a reason is required'; end if;
  insert into public.reports (reporter_id, subject_type, subject_id, subject_label, reason, details)
  values (v_uid, p_subject_type, p_subject_id, p_subject_label, trim(p_reason), nullif(trim(p_details),''))
  returning * into v_row;
  -- alert reviewers (never blocks the report)
  begin
    for v_admin in select user_id from public.app_admins loop
      perform public.enqueue_notification(v_admin.user_id, 'gym_status',
        'New report to review',
        'A ' || p_subject_type || ' was reported: ' || trim(p_reason),
        jsonb_build_object('reportId', v_row.id, 'subjectType', p_subject_type, 'subjectId', p_subject_id),
        v_row.id::text);
    end loop;
  exception when others then null;
  end;
  return v_row;
end; $$;
revoke execute on function public.submit_report(text,text,text,text,text) from public, anon;
grant execute on function public.submit_report(text,text,text,text,text) to authenticated;

create or replace function public.resolve_report(p_report_id uuid, p_status text, p_resolution text default null)
returns public.reports language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.reports;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.app_admins a where a.user_id = v_uid) then raise exception 'admin only'; end if;
  if p_status not in ('open','reviewing','resolved','dismissed') then raise exception 'invalid status'; end if;
  update public.reports set
    status = p_status,
    resolution = coalesce(nullif(trim(p_resolution),''), resolution),
    resolved_at = case when p_status in ('resolved','dismissed') then now() else null end
  where id = p_report_id returning * into v_row;
  if not found then raise exception 'report not found'; end if;
  return v_row;
end; $$;
revoke execute on function public.resolve_report(uuid,text,text) from public, anon;
grant execute on function public.resolve_report(uuid,text,text) to authenticated;
