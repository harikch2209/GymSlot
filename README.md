# GymSlot 🏋️ — Pay-Per-Slot Gym Booking App

A cross-platform **mobile app** (iOS / Android / Web) built with **Expo + React Native + TypeScript**, implementing the consumer side of the *GymSlot* Product Requirements Document — a three-sided pay-per-slot gym marketplace for the Indian market.

> Think “turf booking, but for gyms” — with live crowd visibility, an on-demand trainer add-on, wallet credits, and gym-hosted events.

## Why

Gym-goers in India are forced into monthly/yearly memberships but often visit only a few times a month, wasting most of what they paid. GymSlot lets users **pay only for the sessions they actually attend**, see how crowded a gym is *right now*, and book a 30 or 60-minute slot in under a minute.

## What's implemented (this prototype)

This is a runnable, self-contained **front-end prototype** with an in-memory data layer (no backend required) covering the PRD's P0 user-app surface:

| PRD Module | Feature | Status |
|---|---|---|
| 1.1 Discovery | Location-style gym list with distance, price, rating, **live crowd indicator**, filters (sort / crowd / amenities) & search | ✅ |
| 1.1 Detail | Gym detail page: photos, about, timings, amenities, **slot grid** with per-slot price & remaining capacity | ✅ |
| 1.2 Booking | Day + slot selection → **optional personal-trainer add-on** (fee range, per-trainer selection) → checkout | ✅ |
| 1.2 Payment | Checkout with **UPI / Card / Net banking**, GST-inclusive pricing, **wallet credits** applied partially | ✅ |
| 1.3 Check-in | **QR ticket** per booking + simulated gym check-in (QR marked used after) | ✅ |
| 2.1 Crowd | Crowd buckets (Low / Moderate / High / Full / Not available) with **"updated X min ago"** staleness | ✅ |
| 4.2 Trainer | Trainer toggle, fee held messaging, assignment shown on ticket | ✅ |
| 6 Notifications | Confirmation messaging (app + WhatsApp copy) | ✅ (UI) |
| 7 Wallet | **Credit ledger** with reason codes, balance, **refund-to-credits +5% bonus** on cancellation | ✅ |
| 8 Events | Events tab + detail, **free (one-tap) & paid reservations**, QR ticket, no-show note | ✅ |
| 5 Trust | Booking status, cancellation policy, support entry points | ✅ (UI) |

Out of scope for this prototype (per PRD non-goals / later phases): real payment gateway, backend/DB, gym-partner & trainer apps, push delivery, sensor-based crowd sensing.

## Tech

- **Expo SDK 52** with **Expo Router** (file-based navigation, typed routes)
- **React Native 0.76** + **TypeScript** (strict)
- `react-native-qrcode-svg` for real QR ticket generation
- React Context for wallet + bookings state
- A single dark, energetic design system in `src/theme.ts`

## Project structure

```
app/                      # Expo Router routes
  _layout.tsx             # Root stack + providers
  (tabs)/                 # Discover · Events · Bookings · Wallet · Profile
  gym/[id].tsx            # Gym detail + slot grid
  book/[id].tsx           # Slot + trainer selection
  checkout.tsx            # Credits + payment
  event/[id].tsx          # Event detail + reserve
  ticket/[id].tsx         # QR confirmation
src/
  components/             # UI kit, GymCard, CrowdBadge, QRTicket
  context/AppContext.tsx  # Bookings + credit wallet state
  data/                   # Mock gyms, trainers, events
  utils/                  # Formatting + crowd helpers
  theme.ts, types.ts
```

## Run it

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)
# or directly:
npm run web
```

Type-check:

```bash
npm run typecheck
```

## Try this flow

1. **Discover** → filter by crowd “Low” → open *IronCore Fitness*.
2. Pick a slot → toggle **Add a personal trainer** → choose one → **Proceed to pay**.
3. At **Checkout**, toggle **Use wallet credits** (₹250 welcome bonus) → pay with UPI.
4. Get your **QR ticket** → tap **Simulate gym check-in**.
5. Go to **Bookings** → cancel a confirmed one → choose **Instant credits +5%** → watch the **Wallet** ledger update.
6. Open **Events** → reserve the free *Cardio Bootcamp* in one tap.

---

Built from the *Pay-Per-Slot Gym Booking App* PRD (v0.2).
