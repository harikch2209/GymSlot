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

## Conventions

- Import from `src/` via the `@/*` alias (`@/lib/api`, `@/theme`, `@/context/AppContext`).
- Money: `inr()` from `@/utils/format`. Crowd: `crowdColor`/`crowdLabel`. Relative time: `ago()`.
- `Booking.qrPayload` is `GYMSLOT|<KIND>|<bookingId>|<gymId>`, stamped server-side in `create_booking`.
- Env: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (gitignored; anon key
  is RLS-protected and safe to ship). EAS builds inject them via `eas.json`.
- After any DB schema change: update `supabase/migrations/`, regenerate `database.types.ts`, and
  re-run the Supabase security advisor.
