# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install deps
npm start            # Expo dev server; press i (iOS) / a (Android) / w (web)
npm run web | android | ios
npm run typecheck    # tsc --noEmit — the only automated check in the repo
node scripts/generate-icons.mjs   # regenerate app icons/splash from the SVG mark
```

There is **no test runner and no linter** configured. `npm run typecheck` is the sole gate —
run it after changes. TypeScript is `strict`. Read [`DESIGN.md`](DESIGN.md) before any UI change.

## What this is

A production-oriented pay-per-slot gym booking app. It is **backed by a real Supabase project**
(`gymslot`, ap-south-1): Auth + Postgres + Row Level Security. The app is gated behind auth.
Payments are still **simulated** (no gateway), but the booking/wallet logic behind checkout is
real and server-validated.

## Architecture

**Routing — Expo Router (file-based, typed routes).** `app/` files *are* routes. `app/_layout.tsx`
loads Inter fonts, wraps the tree in `AuthProvider` + `AppProvider`, and **gates navigation**:
`RootNavigator` redirects unauthenticated users to `(auth)/welcome` and authenticated users into
`(tabs)`. Don't add a separate navigation config.

**Backend — Supabase.** Client in `src/lib/supabase.ts` (AsyncStorage session, auto-refresh tied
to AppState). All data access goes through `src/lib/api.ts`, which maps snake_case rows to
camelCase domain types (`src/types.ts` has the mappers). Generated DB types live in
`src/lib/database.types.ts` (regenerate with the Supabase MCP/CLI after schema changes).

**Security is server-side — do not bypass it.** Catalog tables (`gyms`, `slots`, `trainers`,
`events`) are read-only to clients. `bookings`, `credit_ledger`, `profiles` are RLS-locked to the
owner. **Writes to bookings/wallet happen ONLY through `SECURITY DEFINER` RPCs** —
`create_booking`, `cancel_booking`, `checkin`, `ensure_profile` (defined in
`supabase/migrations/0002_functions.sql`, called via `api.ts`). These validate credit balances and
compute the +5% cancellation bonus server-side. Never move that logic into the client, and never
insert into `bookings`/`credit_ledger` directly. The wallet balance is the **sum of the ledger**
(`credit_balance()` RPC / reduced in `AppContext`) — never tracked as a standalone column.

**State — two contexts.** `AuthContext` owns the Supabase session (`useAuth`). `AppContext`
(`useApp`) owns the user's `bookings` + `ledger`, derives `creditBalance`, and exposes
`createBooking` / `cancelBooking` / `checkIn` (each calls an RPC then refreshes). Catalog screens
fetch via the `useResource(fetcher, deps)` hook (`src/hooks/useResource.ts`) which gives
loading/error/pull-to-refresh.

**Booking flow.** `book/[id]` collects slot + optional trainer and passes them to `checkout` as
URL **string** params; checkout coerces them and calls `createBooking` (the RPC), then
`router.replace('/ticket/<id>')`. The booking doesn't exist until checkout commits it.

**UI system.** One design system in `src/theme.ts` (`colors`, `spacing`, `radius`, `type`, `shadow`,
`fonts`). Primitives in `src/components/ui.tsx` (`AppText`, `Button`, `Card`, `Field`, `Chip`,
`Badge`, `Avatar`, `EmptyState`, `Skeleton`, …) — use these, not raw RN `Text`/`Pressable`. Icons
are **Ionicons** (`@expo/vector-icons`), not emoji. Images use **expo-image** with remote URLs.

## Marketplace features

**Map + location (`app/map.tsx`, `src/hooks/useLocation.ts`, `src/utils/geo.ts`).** `react-native-maps`
with gym price-pins; `expo-location` gives GPS with a city-centre fallback when denied. Distances are
computed client-side (haversine) and injected into the gym list in Discover — `Gym.distanceKm` is null
from the API and filled per-render. Works in Expo Go and iOS (Apple Maps); a standalone Android build
needs a Google Maps key (`app.json` placeholder).

**Reviews (`src/components/ReviewsSection.tsx`).** `reviews` table is world-readable; writes go only
through the `submit_review` RPC, which **requires the caller to have a booking at that gym** and upserts
(one review per user/gym). The gym's headline rating stays seeded; the reviews list is real.

**Live crowd.** The `checkin` RPC nudges the gym one bucket busier and stamps `crowd_updated_at`, so the
crowd indicator reflects real activity. Don't recompute crowd on the client.

**Partner side (`app/partner/`).** `gym_owners` records ownership; a partner RLS policy lets owners read
bookings for gyms they own (users still read only their own). `claim_gym` (demo onboarding) and
`partner_checkin` (ownership-checked) are RPCs. `bookings.member_name` is denormalised at creation so
partners see who's arriving without reading private profiles. Earnings use `COMMISSION_RATE` (15%) in
`api.ts`.

**Payments (`supabase/functions/`, `src/components/RazorpayCheckout.tsx`).** Razorpay, never client-trusted:
`create-payment-order` computes the payable **server-side from the catalog** and creates the order;
`verify-payment` checks the HMAC signature, then creates the booking via the user-scoped `create_booking`
RPC and records the commission/payout split in `payments`. The client only opens Razorpay Checkout in a
WebView and relays the result. The **Key Secret lives only in the Edge Function secret `RAZORPAY_KEY_SECRET`**
— never add it to the app or repo. Full-credit bookings (payable 0) skip Razorpay and book directly.

## Conventions

- Import from `src/` via the `@/*` alias (`@/lib/api`, `@/theme`, `@/context/AppContext`).
- Money: `inr()` from `@/utils/format`. Crowd: `crowdColor`/`crowdLabel`. Relative time: `ago()`.
- `Booking.qrPayload` is `GYMSLOT|<KIND>|<bookingId>|<gymId>`, stamped server-side in `create_booking`.
- Env: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (gitignored; anon key
  is RLS-protected and safe to ship). EAS builds inject them via `eas.json`.
- After any DB schema change: update `supabase/migrations/`, regenerate `database.types.ts`, and
  re-run the Supabase security advisor.
