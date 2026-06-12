-- 0014 — Wallet & credits: 6-month expiry, goodwill issuance, expiry reminders (Module 7).
-- Earned credits expire after 6 months (7.1-C); a trigger stamps the expiry on
-- every insert path so no credit-granting RPC needs editing. credit_balance()
-- excludes expired credits. Goodwill/support issuance (7.1-A) is admin-gated, and
-- a daily pg_cron reminder fires ~7 days before expiry (7-AC4).

alter table public.credit_ledger add column if not exists expires_at timestamptz;
alter table public.credit_ledger add column if not exists expiry_reminded_at timestamptz;

-- Auto-stamp a 6-month expiry on EARNED credits (positive, non-spend) on insert.
create or replace function public.stamp_credit_expiry() returns trigger
language plpgsql set search_path = public as $$
begin
  if NEW.amount > 0 and NEW.reason in ('cancellation-bonus','promo','goodwill','refund') and NEW.expires_at is null then
    NEW.expires_at := now() + interval '6 months';
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_credit_expiry on public.credit_ledger;
create trigger trg_credit_expiry before insert on public.credit_ledger
  for each row execute function public.stamp_credit_expiry();

-- Available balance excludes expired earned credits (floored at 0).
create or replace function public.credit_balance() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, coalesce(sum(amount), 0))::int from public.credit_ledger
  where user_id = auth.uid() and (expires_at is null or expires_at > now());
$$;
revoke execute on function public.credit_balance() from public, anon;
grant execute on function public.credit_balance() to authenticated;

-- 7.1-A — goodwill / support credit issuance (admin only), notifies the user.
create or replace function public.issue_goodwill(p_user_id uuid, p_amount int, p_label text default null)
returns public.credit_ledger language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.credit_ledger;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.app_admins a where a.user_id = v_uid) then raise exception 'admin only'; end if;
  if coalesce(p_amount,0) <= 0 then raise exception 'amount must be positive'; end if;
  insert into public.credit_ledger (user_id, amount, reason, label)
  values (p_user_id, p_amount, 'goodwill', coalesce(nullif(trim(p_label),''), 'Goodwill credit from support'))
  returning * into v_row;
  begin
    perform public.enqueue_notification(p_user_id, 'refund_status', 'Credits added',
      '₹' || p_amount::text || ' in goodwill credits were added to your wallet.',
      jsonb_build_object('ledgerId', v_row.id), v_row.id::text);
  exception when others then null; end;
  return v_row;
end; $$;
revoke execute on function public.issue_goodwill(uuid,int,text) from public, anon;
grant execute on function public.issue_goodwill(uuid,int,text) to authenticated;

-- 7-AC4 — remind ~7 days before credits expire (one reminder per ledger entry).
create or replace function public.dispatch_expiring_credits() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0;
begin
  for r in
    select * from public.credit_ledger
    where amount > 0 and expires_at is not null and expiry_reminded_at is null
      and expires_at between now() + interval '6 days' and now() + interval '8 days'
    for update skip locked
  loop
    perform public.enqueue_notification(r.user_id, 'credit_expiry',
      'Credits expiring soon',
      '₹' || r.amount::text || ' in credits expire on ' ||
        to_char(r.expires_at at time zone 'Asia/Kolkata', 'DD Mon') || '. Use them before they’re gone.',
      jsonb_build_object('ledgerId', r.id), r.id::text);
    update public.credit_ledger set expiry_reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.dispatch_expiring_credits() from public, anon, authenticated;

-- Daily expiry-reminder scan (pg_cron already enabled in 0008b).
do $$ begin perform cron.unschedule('gymslot-expiring-credits'); exception when others then null; end $$;
select cron.schedule('gymslot-expiring-credits', '0 9 * * *', $cron$select public.dispatch_expiring_credits()$cron$);
