-- 0008b — Realtime feed + pg_cron reminder schedule for the notifications core (0008).
-- Split from 0008 so the core tables/functions land independently of pg_cron
-- enablement. Idempotent: safe to re-apply.

-- Let the app subscribe to its own incoming notifications live (Supabase Realtime).
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- Slot reminders ~1h before, scanned every 5 minutes (PRD 6.2).
create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('gymslot-reminders'); exception when others then null; end $$;
select cron.schedule('gymslot-reminders', '*/5 * * * *', $cron$select public.dispatch_due_reminders()$cron$);
