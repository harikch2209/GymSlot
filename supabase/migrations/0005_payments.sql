-- Payment audit trail for Razorpay. Written only by the Edge Functions
-- (create-payment-order / verify-payment, which use the service role); users read
-- their own. Amount/commission/payout are computed server-side.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  kind text not null check (kind in ('slot','event')),
  gym_id text,
  gym_name text,
  slot_id text,
  event_id text,
  trainer_id text,
  trainer_name text,
  title text not null,
  booking_date text not null,
  time text not null,
  duration_mins int not null,
  amount int not null,           -- payable (cash) in INR
  credits_used int not null default 0,
  commission int not null,       -- platform fee on the payable
  gym_payout int not null,       -- amount - commission
  status text not null default 'created' check (status in ('created','paid','failed')),
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);
create index if not exists payments_order_idx on public.payments(razorpay_order_id);

alter table public.payments enable row level security;
create policy payments_select on public.payments for select using (auth.uid() = user_id);
-- no insert/update/delete policies: only the service role (Edge Functions) writes.
