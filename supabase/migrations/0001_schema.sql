-- GymSlot core schema. Catalog tables are world-readable; user-owned tables
-- are locked to the owner via RLS. Mutations happen only through the
-- SECURITY DEFINER functions in 0002 (clients can't write bookings/ledger directly).

create table if not exists public.gyms (
  id text primary key,
  name text not null,
  area text not null,
  city text not null default 'Bengaluru',
  lat double precision,
  lng double precision,
  rating numeric(2,1) not null default 0,
  reviews integer not null default 0,
  price_from integer not null,
  crowd text not null default 'Unknown' check (crowd in ('Low','Moderate','High','Full','Unknown')),
  crowd_updated_at timestamptz default now(),
  amenities text[] not null default '{}',
  image_url text,
  images text[] not null default '{}',
  about text,
  timings text,
  created_at timestamptz not null default now()
);

create table if not exists public.slots (
  id text primary key,
  gym_id text not null references public.gyms(id) on delete cascade,
  time text not null,
  duration integer not null check (duration in (30,60)),
  price integer not null,
  capacity integer not null default 12,
  peak boolean not null default false,
  sort_order integer not null default 0
);
create index if not exists slots_gym_idx on public.slots(gym_id);

create table if not exists public.trainers (
  id text primary key,
  name text not null,
  specializations text[] not null default '{}',
  experience_years integer not null default 0,
  rating numeric(2,1) not null default 0,
  fee_30 integer not null,
  fee_60 integer not null,
  languages text[] not null default '{}',
  avatar_url text,
  bio text
);

create table if not exists public.events (
  id text primary key,
  gym_id text references public.gyms(id) on delete set null,
  gym_name text not null,
  title text not null,
  category text not null,
  description text,
  event_date text not null,
  event_time text not null,
  duration_mins integer not null,
  capacity integer not null,
  reserved_seed integer not null default 0,
  price integer not null default 0,
  image_url text,
  what_to_bring text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  city text default 'Bengaluru',
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('slot','event')),
  gym_id text,
  gym_name text not null,
  slot_id text,
  event_id text,
  title text not null,
  booking_date text not null,
  time text not null,
  duration_mins integer not null,
  amount_paid integer not null default 0,
  credits_used integer not null default 0,
  trainer_id text,
  trainer_name text,
  trainer_status text check (trainer_status in ('Searching','Assigned','Unmatched')),
  status text not null default 'Confirmed' check (status in ('Confirmed','Completed','Cancelled')),
  qr_payload text not null,
  checked_in boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings(user_id, created_at desc);
create index if not exists bookings_slot_idx on public.bookings(slot_id, booking_date);
create index if not exists bookings_event_idx on public.bookings(event_id);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('refund','cancellation-bonus','promo','goodwill','spend')),
  label text not null,
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_user_idx on public.credit_ledger(user_id, created_at desc);

alter table public.gyms enable row level security;
alter table public.slots enable row level security;
alter table public.trainers enable row level security;
alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.credit_ledger enable row level security;

create policy gyms_read on public.gyms for select using (true);
create policy slots_read on public.slots for select using (true);
create policy trainers_read on public.trainers for select using (true);
create policy events_read on public.events for select using (true);

create policy profiles_select on public.profiles for select using (auth.uid() = id);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy bookings_select on public.bookings for select using (auth.uid() = user_id);
create policy ledger_select on public.credit_ledger for select using (auth.uid() = user_id);
