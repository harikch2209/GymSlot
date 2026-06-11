# Security

How GymSlot protects user data, and how to report issues.

## Reporting a vulnerability

Email **harikch97@gmail.com** with steps to reproduce. Please do not open public issues for
security reports. We aim to acknowledge within 72 hours.

## Architecture & controls

**Authentication.** Supabase Auth (email + password). Passwords are salted-and-hashed by
Supabase; the app never sees or stores a plaintext password. Sessions are JWTs with
automatic refresh, persisted on-device and refreshed only while the app is foregrounded.

**Row Level Security (RLS).** Every table has RLS enabled:
- Catalog tables (`gyms`, `slots`, `trainers`, `events`) and `reviews` are read-only to clients.
- `profiles`, `bookings`, `credit_ledger`, `payments` are restricted to `auth.uid() = user_id`. A
  user can never read or write another user's rows, even with a valid anon key.
- **Partner access:** a gym owner (`gym_owners`) can read bookings for gyms they own via a dedicated
  policy — but only those, and reads only. `member_name` is denormalised onto bookings so partners
  never read other users' `profiles`.

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

**Payments (Razorpay).** Handled by two Supabase Edge Functions (`supabase/functions/`):
- `create-payment-order` computes the payable amount **server-side from the catalog** (the client
  cannot set its own price) and creates the Razorpay order.
- `verify-payment` verifies the Razorpay **HMAC-SHA256 signature** (`order_id|payment_id`) before
  creating the booking. A forged or replayed signature is rejected and the payment marked failed.
- **No card / UPI / bank data touches our servers or DB** — Razorpay's hosted checkout collects it.
  We store only the order/payment IDs and amounts (`payments` table), so PCI scope is minimal.
- The **Key Secret** lives only in the Edge Function secret `RAZORPAY_KEY_SECRET` (set via
  `supabase secrets set` / dashboard) — never in the client bundle or repo. The Key ID is publishable.

**Edge Functions.** `verify_jwt` is enabled, so both functions require a signed-in user; they also
re-derive the caller from the JWT and use the service role only for the audit-row writes.

## Dependencies

`npm audit` advisories are reviewed before release. Native modules are pinned to
Expo-SDK-compatible versions via `npx expo install`.

## Hardening checklist (pre-launch)

- [ ] Enable email confirmation in Supabase Auth (Auth → Providers → Email).
- [ ] Set a password strength policy and leaked-password protection in Supabase Auth.
- [ ] Add rate limiting / CAPTCHA on auth if abuse appears.
- [ ] Rotate the anon key if it is ever paired with weakened RLS.
- [ ] Re-run the Supabase security advisor after any schema change.
