-- 0015 — Correct credit-expiry accounting (Module 7 review fix).
-- Bug: credit_balance() = sum(non-expired rows) over-subtracts a credit that was
-- already SPENT before it expired — the negative 'spend' row never expires but the
-- positive grant it consumed drops out, zeroing valid balance. Since every earned
-- credit shares the same 6-month window, expiry order == earn order == FIFO spend
-- order, so the correct available balance is:
--   max(0, min(lifetime_net, non_expired_earned))
-- where lifetime_net = sum(all) and non_expired_earned = sum(positive, not expired).

create or replace function public.credit_balance() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, least(
    coalesce(sum(amount), 0),
    coalesce(sum(amount) filter (where amount > 0 and (expires_at is null or expires_at > now())), 0)
  ))::int
  from public.credit_ledger
  where user_id = auth.uid();
$$;
revoke execute on function public.credit_balance() from public, anon;
grant execute on function public.credit_balance() to authenticated;

-- Expiry reminder, now per-user and spend-aware: only remind users who still have
-- an available balance, cap the figure at what's actually losable, and mark all of
-- the user's soon-expiring grants reminded (one notification per user).
create or replace function public.dispatch_expiring_credits() returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_count int := 0; v_amount int;
begin
  for r in
    select
      cl.user_id,
      coalesce(sum(cl.amount) filter (
        where cl.amount > 0 and cl.expiry_reminded_at is null
          and cl.expires_at between now() + interval '6 days' and now() + interval '8 days'
      ), 0) as soon,
      greatest(0, least(
        coalesce(sum(cl.amount), 0),
        coalesce(sum(cl.amount) filter (where cl.amount > 0 and (cl.expires_at is null or cl.expires_at > now())), 0)
      )) as available
    from public.credit_ledger cl
    group by cl.user_id
    having count(*) filter (
      where cl.amount > 0 and cl.expiry_reminded_at is null
        and cl.expires_at between now() + interval '6 days' and now() + interval '8 days'
    ) > 0
  loop
    v_amount := least(r.soon, r.available);
    if v_amount > 0 then
      perform public.enqueue_notification(r.user_id, 'credit_expiry',
        'Credits expiring soon',
        '₹' || v_amount::text || ' in credits expire in about a week — use them before they''re gone.',
        jsonb_build_object('amount', v_amount), null);
      v_count := v_count + 1;
    end if;
    -- mark this user's soon-expiring grants reminded regardless, so we don't re-scan them
    update public.credit_ledger set expiry_reminded_at = now()
    where user_id = r.user_id and amount > 0 and expiry_reminded_at is null
      and expires_at between now() + interval '6 days' and now() + interval '8 days';
  end loop;
  return v_count;
end; $$;
revoke execute on function public.dispatch_expiring_credits() from public, anon, authenticated;
