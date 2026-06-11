# GymSlot 🏋️ — Pay-Per-Slot Gym Booking App

A production-grade, cross-platform **mobile app** (iOS / Android / Web) built with
**Expo + React Native + TypeScript**, backed by **Supabase** (auth + Postgres + Edge Functions).
GymSlot is a two-sided pay-per-slot gym marketplace for the Indian market — "turf booking, but for
gyms" — with a **map** of nearby gyms, live crowd visibility, an on-demand trainer add-on, wallet
credits, QR check-in, ratings & reviews, gym events, **real payments (Razorpay) with gym payouts**,
and a **gym-partner side** for owners to manage bookings and check members in.

> Pay only for the sessions you actually attend. See how crowded a gym is right now. Book a
> 30 or 60-minute slot in under a minute.

## Highlights

- **Real backend** — Supabase Auth (email/password) + Postgres with Row Level Security. Every
  user's bookings and wallet are isolated at the database level.
- **Two-sided marketplace** — a consumer app *and* a gym-partner side (claim a gym, see its
  bookings, scan member QRs to check them in, track payouts after commission).
- **Real payments** — Razorpay checkout with the **price computed and the signature verified
  server-side** in Supabase Edge Functions; the booking only exists after a verified payment.
  Commission/gym-payout split is recorded. See [`SECURITY.md`](SECURITY.md).
- **Map + real location** — gyms as map pins with the user's GPS location and live distances.
- **Server-authoritative money** — bookings, credit spend, and refunds run in `SECURITY DEFINER`
  Postgres functions, so amounts can't be forged from the client.
- **Premium light UI** — a Cult.fit-inspired design system (emerald accent, Inter, real
  photography, soft depth). Documented in [`DESIGN.md`](DESIGN.md).
- **Accessible** — screen-reader labels, AA contrast, ≥44px targets. See [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
- **Store-ready** — generated app icons/splash, `app.json` + `eas.json` configured, store copy
  and privacy answers written. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Features

| Module | Feature |
|---|---|
| Auth | Email/password sign-up & sign-in, session persistence, ₹250 welcome credits |
| Discover | Gym list with real photos, **real GPS distance**, price, rating, **live crowd**, search + filters |
| Map | Gyms as price-pins on a map, your live location, tap-pin preview → gym detail |
| Gym detail | Photo gallery, amenities, live slot availability, **ratings & reviews** |
| Reviews | Star rating + review, gated to people who've booked the gym (server-enforced) |
| Booking | Day + slot selection → optional **personal-trainer** add-on → checkout |
| Checkout | **Razorpay** payment (real, test mode), GST-inclusive pricing, **wallet credits** |
| Check-in | **QR ticket** per booking; member self-check-in or partner-scanned check-in |
| Live crowd | Crowd level rises with real check-ins, with an "updated X ago" freshness stamp |
| Wallet | Credit **ledger** with reasons, balance, **refund-to-credits +5% bonus** on cancel |
| Events | Bootcamps, workshops, yoga — free (one-tap) & paid reservations with QR |
| Partner | Claim a gym → see bookings, **scan member QR** to check in, **payout** after 15% commission |
| Profile | Stats, account, partner entry, sign out |

## Tech stack

- **Expo SDK 52** + **Expo Router** (file-based, typed routes)
- **React Native 0.76** + **TypeScript** (strict)
- **Supabase** — `@supabase/supabase-js`, Auth, Postgres, RLS, RPCs, **Edge Functions** (Deno)
- **Razorpay** — checkout in a WebView; orders + signature verification in Edge Functions
- `react-native-maps`, `expo-location` (map + GPS), `expo-camera` (partner QR scan),
  `react-native-webview` (payment)
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
  map.tsx                 # gym map (react-native-maps)
  partner/                # index (dashboard) · scan (QR check-in camera)
  gym/[id]  book/[id]  checkout  event/[id]  ticket/[id]
src/
  lib/                    # supabase client, api (queries + RPCs + Edge Functions), db types
  context/                # AuthContext (session) · AppContext (bookings + wallet)
  components/             # ui kit, GymCard, CrowdBadge, QRTicket, ReviewsSection, RazorpayCheckout
  hooks/                  # useResource, useLocation
  theme.ts  types.ts  utils/ (format, geo)
supabase/
  migrations/             # 0001 schema · 0002 functions · 0003 reviews+crowd · 0004 partner · 0005 payments
  functions/              # create-payment-order · verify-payment (Razorpay, Deno)
  seed.sql
```

## Documentation

- [`DESIGN.md`](DESIGN.md) — design system source of truth
- [`SECURITY.md`](SECURITY.md) — security model & reporting
- [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) — privacy policy
- [`ACCESSIBILITY.md`](ACCESSIBILITY.md) — a11y status
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — build & store submission
- [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md) — listing copy + data-safety answers
- [`CLAUDE.md`](CLAUDE.md) — architecture notes for contributors

## Payments setup

Payments use **Razorpay in test mode**. The Key ID ships in the client; the **Key Secret must be
set as a Supabase Edge Function secret** (never in the app/repo):

```bash
supabase secrets set RAZORPAY_KEY_SECRET=your_test_secret --project-ref achbypmmiblntmbhrijm
```

Then book a slot with an amount payable and use a Razorpay test card (`4111 1111 1111 1111`, any
future expiry/CVV → choose **Success**) or test UPI `success@razorpay`.

## Scope notes

- **Payments are real (test mode):** orders are created and signatures verified server-side; a
  booking only exists after a verified payment. **No card/UPI data touches our servers** —
  Razorpay's checkout collects it. Going to **live money + actual gym payouts** needs a
  KYC-verified Razorpay merchant account and **Razorpay Route** (linked accounts/settlements); the
  commission/payout split is already modeled and recorded.
- **Maps:** work in Expo Go and on iOS (Apple Maps) out of the box; a *standalone Android build*
  needs a Google Maps API key (placeholder in `app.json`).
- **Push notifications** are not yet wired (needs FCM/APNs via EAS).

---

Built from the *Pay-Per-Slot Gym Booking App* PRD.
