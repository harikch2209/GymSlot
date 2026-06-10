# Security

How GymSlot protects user data, and how to report issues.

## Reporting a vulnerability

Email **harikch97@gmail.com** with steps to reproduce. Please do not open public issues for
security reports. We aim to acknowledge within 72 hours.

## Architecture & controls

**Authentication.** Supabase Auth (email + password). Passwords are salted-and-hashed by
Supabase; the app never sees or stores a plaintext password. Sessions are JWTs with
automatic refresh, persisted on-device and refreshed only while the app is foregrounded.

**Row Level Security (RLS).** Every table has RLS enabled (`supabase/migrations/0001_schema.sql`):
- Catalog tables (`gyms`, `slots`, `trainers`, `events`) are read-only to clients.
- `profiles`, `bookings`, `credit_ledger` are restricted to `auth.uid() = user_id`. A user
  can never read or write another user's rows, even with a valid anon key.

**Server-authoritative money logic.** Clients cannot write `bookings` or `credit_ledger`
directly. All mutations go through `SECURITY DEFINER` RPCs (`0002_functions.sql`):
`create_booking`, `cancel_booking`, `checkin`, `ensure_profile`. These re-derive the caller
from `auth.uid()`, validate credit balances server-side, and compute refund bonuses — so a
malicious client can't forge amounts, grant itself credits, or cancel someone else's booking.
`EXECUTE` on these is granted to `authenticated` only; the implicit `PUBLIC`/`anon` grant is
revoked (`0003_harden_function_grants` / verified via Supabase security advisor).

**Secrets.** The only key shipped in the client is the Supabase **anon** key, which is
designed to be public and is meaningless without RLS-permitted access. `.env` is gitignored;
`.env.example` documents the variables. No service-role key, no private keys, and no real
payment credentials exist in the app or repo.

**Transport.** All traffic to Supabase is HTTPS/TLS.

**Payments.** Payments are simulated in this version; no PAN, UPI VPA, or bank data is
collected, stored, or transmitted, so PCI scope is zero. Wiring a real gateway (e.g.
Razorpay) must keep card data off our servers (use the gateway's tokenised SDK) and verify
payment server-side before confirming a booking — see `docs/DEPLOYMENT.md`.

## Dependencies

`npm audit` advisories are reviewed before release. Native modules are pinned to
Expo-SDK-compatible versions via `npx expo install`.

## Hardening checklist (pre-launch)

- [ ] Enable email confirmation in Supabase Auth (Auth → Providers → Email).
- [ ] Set a password strength policy and leaked-password protection in Supabase Auth.
- [ ] Add rate limiting / CAPTCHA on auth if abuse appears.
- [ ] Rotate the anon key if it is ever paired with weakened RLS.
- [ ] Re-run the Supabase security advisor after any schema change.
