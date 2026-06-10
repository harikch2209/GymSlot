# GymSlot 🏋️ — Pay-Per-Slot Gym Booking App

A production-grade, cross-platform **mobile app** (iOS / Android / Web) built with
**Expo + React Native + TypeScript**, backed by **Supabase** (auth + Postgres). GymSlot is a
pay-per-slot gym marketplace for the Indian market — "turf booking, but for gyms" — with live
crowd visibility, an on-demand trainer add-on, wallet credits, QR check-in, and gym events.

> Pay only for the sessions you actually attend. See how crowded a gym is right now. Book a
> 30 or 60-minute slot in under a minute.

## Highlights

- **Real backend** — Supabase Auth (email/password) + Postgres with Row Level Security. Every
  user's bookings and wallet are isolated at the database level.
- **Server-authoritative money** — bookings, credit spend, and refunds run in `SECURITY DEFINER`
  Postgres functions, so amounts can't be forged from the client. See [`SECURITY.md`](SECURITY.md).
- **Premium light UI** — a Cult.fit-inspired design system (emerald accent, Inter, real
  photography, soft depth). Documented in [`DESIGN.md`](DESIGN.md).
- **Accessible** — screen-reader labels, AA contrast, ≥44px targets. See [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
- **Store-ready** — generated app icons/splash, `app.json` + `eas.json` configured, store copy
  and privacy answers written. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Features

| Module | Feature |
|---|---|
| Auth | Email/password sign-up & sign-in, session persistence, ₹250 welcome credits |
| Discover | Gym list with real photos, distance, price, rating, **live crowd**, search + filters |
| Gym detail | Photo gallery, amenities, live slot availability |
| Booking | Day + slot selection → optional **personal-trainer** add-on → checkout |
| Checkout | UPI / Card / Net-banking (simulated), GST-inclusive pricing, **wallet credits** |
| Check-in | **QR ticket** per booking + simulated gym check-in |
| Wallet | Credit **ledger** with reasons, balance, **refund-to-credits +5% bonus** on cancel |
| Events | Bootcamps, workshops, yoga — free (one-tap) & paid reservations with QR |
| Profile | Stats, account, sign out |

## Tech stack

- **Expo SDK 52** + **Expo Router** (file-based, typed routes)
- **React Native 0.76** + **TypeScript** (strict)
- **Supabase** — `@supabase/supabase-js`, Auth, Postgres, RLS, RPCs
- `expo-image`, `expo-linear-gradient`, `@expo-google-fonts/inter`, `react-native-reanimated`,
  `expo-haptics`, `react-native-qrcode-svg`

## Run it locally

```bash
npm install
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL + ANON_KEY (already set for the team)
npm start                # press i (iOS), a (Android), or w (web)
npm run typecheck        # tsc --noEmit — the quality gate
```

The Supabase backend (project `gymslot`, ap-south-1) is already provisioned. To recreate it
elsewhere, apply `supabase/migrations/*.sql` then `supabase/seed.sql` — see
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Project structure

```
app/                      # Expo Router routes
  _layout.tsx             # Fonts, providers, auth-gated navigation
  (auth)/                 # welcome · sign-in · sign-up
  (tabs)/                 # Discover · Events · Bookings · Wallet · Profile
  gym/[id]  book/[id]  checkout  event/[id]  ticket/[id]
src/
  lib/                    # supabase client, api (queries + RPCs), generated db types
  context/                # AuthContext (session) · AppContext (bookings + wallet)
  components/             # ui kit, GymCard, CrowdBadge, QRTicket
  hooks/                  # useResource (async + pull-to-refresh)
  theme.ts  types.ts  utils/
supabase/
  migrations/             # 0001 schema+RLS · 0002 functions · seed.sql
```

## Documentation

- [`DESIGN.md`](DESIGN.md) — design system source of truth
- [`SECURITY.md`](SECURITY.md) — security model & reporting
- [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) — privacy policy
- [`ACCESSIBILITY.md`](ACCESSIBILITY.md) — a11y status
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — build & store submission
- [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md) — listing copy + data-safety answers
- [`CLAUDE.md`](CLAUDE.md) — architecture notes for contributors

## Scope notes

Payments are **simulated** in this version (no real charge, no card/UPI/bank data collected) —
the booking and wallet logic behind them is real and server-validated. Wiring a real gateway
(e.g. Razorpay) is the one remaining integration for live transactions; the architecture leaves
a clean seam for it (see `SECURITY.md` and `docs/DEPLOYMENT.md`).

---

Built from the *Pay-Per-Slot Gym Booking App* PRD.
