# PRD Coverage — Tracked Implementation Checklist

This file tracks GymSlot's implementation against the product PRD (Sections 6–8:
user stories, requirements, acceptance criteria). It is the single source of truth
for "what's done vs. what's left." Update the checkbox + status whenever a item lands.

**Generated from a full module-by-module code audit (adversarially verified).**
Last full audit: 2026-06-11.

## Changelog

- **2026-06-11 — Batch 1 (booking integrity, P0):** `create_booking` now enforces **atomic
  slot + event capacity** (serialised by a `FOR UPDATE` row lock), the **per-user event
  reservation limit (2)**, and **blackout-date rejection**. New `gym_blackouts` table (RLS
  read). Applied live (migration `0006`), verified with a self-rolling-back concurrency test
  (normal booking OK; over-capacity → "slot is full"; blacked-out → rejected). Closes
  **1.2-AC1, 8-AC2, 8-AC3** and the event per-user limit.
- **2026-06-11 — Batch 1b (paid events → gateway, P1):** `event/[id].tsx` now routes paid
  events through real Razorpay (`create-payment-order`/`verify-payment`, which calls the
  guarded `create_booking`) with a wallet-credits toggle + payable breakdown; free / fully-
  credit-covered events still one-tap to `createBooking`. Removed the fake `setTimeout`
  "payment". Closes the paid-event **gateway-bypass** gap in 8.2.
- **2026-06-11 — Batch 2 (scheduling + check-in + crowd, P0):** migrations `0007`/`0007b`.
  Added real `starts_at`/`ends_at` to bookings (client computes IST timestamp from the
  upcoming-days picker + slot time) and a 6-digit `checkin_code`. **Check-in is now
  window-enforced** (10-min grace) in `checkin`/`partner_checkin`, with an **OTP fallback**
  (`partner_checkin_by_code`, partner "Enter code") and a **gym override**. Added member
  **`checkout`**. **Crowd v1** is occupancy ÷ `effective_capacity` (+ `walkins`) bucketed by
  `recompute_crowd()`, with a partner **≤2-tap crowd widget** (`partner_set_crowd`),
  staleness degrade (>90 min → "Not available"), and timestamps on cards + detail. Both
  edge functions redeployed to thread `starts_at`. All RPCs verified live (rolled-back tests);
  `typecheck` green. **Closes Module 1.3 entirely and Module 2 (v1).**
- **2026-06-11 — Batch 3 (notifications core, P0):** migrations `0008`/`0008b`. Built the dispatch
  core the rest of the PRD leans on: `notifications` / `notification_prefs` / `push_tokens` tables
  (RLS owner-read; writes via `SECURITY DEFINER` RPCs), `enqueue_notification()` honouring
  per-category prefs and tagging push/SMS channels only when reachable. **Booking confirmation
  (6.1)**, **gym-side new-booking alert (6.5)** and **refund status (6.4)** now fire from
  `create_booking`/`cancel_booking` (fire-and-forget — a notify failure never aborts the booking).
  **Slot reminder ~1 h before (6.2)** via `dispatch_due_reminders()` on a **pg_cron** job (deduped by
  `reminded_at`). Client: `NotificationsContext` (list + unread + Supabase Realtime), in-app
  **Notifications screen** (6.8) + **preferences screen** (6.10), bell-with-badge on Discover +
  Profile entry. **Push (6.6)** + **SMS/WhatsApp (6.7)** ship code-complete but `needs-creds`:
  user-aware `expo-notifications` registration (`src/lib/push.ts`), a `send-notification` Edge
  Function (Expo Push + Twilio, dead-token pruning), and a Vault/pg_net-gated
  `flush_outbound_notifications()` worker — all inert until secrets are set; in-app always works.
  Adversarially reviewed (5 findings → 3 fixed: push-token rebinding on account switch + sign-out
  unregister, read-state clobber guard, Expo per-ticket parsing). Verified live (rolled-back tests:
  confirmation + owner alert fire, category opt-out suppresses, reminder dispatches once, read-state
  RPCs); `typecheck` green; security advisor clean (only the accepted SECURITY-DEFINER-RPC pattern).
  **Closes Module 6 (v1) except trainer events (6.3, awaits Module 4).** Upgrades 1.2-AC4 (in-app).
- **2026-06-12 — Batch 4 (partner onboarding & management, P0):** migrations `0009`/`0010`. Self-serve
  **gym registration wizard** (`app/partner/register.tsx`) → `create_gym` (atomic gym + owner + slots),
  with **KYC/bank capture** (`gym_kyc`) and an **admin verification gate**: new `gyms.status`
  (draft/pending/verified/rejected); gyms RLS rewritten so the **public sees `verified` only** while
  owners/admins see their own/all; `verify_gym` (admin-gated via the non-self-promotable `app_admins`
  table, seeded from existing owners) flips status + notifies the owner (`gym_status`). **Slot config**
  (`create`/`update`/`delete_slot` — 30/60, peak, per-slot capacity) + **blackout dates**
  (`add`/`remove_blackout`) via a new **manage screen** (`app/partner/gym/[id].tsx`). Dashboard
  (`app/partner/index.tsx`) gained per-gym status badges + Manage links, a **Register CTA**, a real
  **Razorpay settlement** card (`partner_settlement`), and an **admin review queue** (approve/reject).
  Discovery now filters to verified. **Adversarial review → 4 fixes (mig `0010`):** the gate was
  read-only — `create_booking` + `create-payment-order` now **reject non-verified gyms** and `slots`
  RLS is scoped to verified-or-owner/admin (a pending gym's slots were world-readable **and bookable**);
  the **blackout guard** compared an ISO date against a day-label and never fired — now compares the IST
  calendar date derived from `starts_at`; partner pull-to-refresh no longer unmounts the screen; the
  manage-screen editors re-seed on refresh. Verified live (rolling-back: register→pending→hidden→admin
  approve→live→bookable; pending booking blocked; blackout blocks; stranger can't see pending slots);
  `typecheck` green; advisor clean. **Closes Module 3 core (signup + verification gate + slot/blackout
  config + dashboard).** Remaining: calendar view, downloadable weekly statements + Razorpay Route
  payouts (needs-creds), refund-netted reconciliation.
- **2026-06-12 — Batch 5 (trust, ratings & support, P0-lite):** migration `0011`. **Gym review tags**
  (`reviews.tags` + server whitelist in `submit_review` — now 4-arg, old 3-arg dropped to avoid
  overload ambiguity) with chips in `ReviewsSection`. **Trainer ratings** (`trainer_reviews` +
  `submit_trainer_review`, gated to a **completed session** with that trainer) surfaced via a
  `TrainerRatingSheet` on completed trainer bookings. **Report/flag flow** (`reports` table +
  `submit_report`, RLS: reporter-own + admin-all) reachable from the gym page; **admin support
  escalation** (`resolve_report`, admin-gated status machine) shown as a **support queue** in the new
  **help center** (`app/help.tsx`: FAQs + your-reports status + WhatsApp deep-link). Verified live
  (rolling-back: tag whitelist drops bogus tags, trainer review blocked until completed then succeeds,
  report submit + admin resolve + non-admin block); `typecheck` green; advisor clean. **Adversarial review →
  fixed:** `fetchMyReports` relied on RLS to scope “Your reports”, but the admin read-all policy meant a
  partner-admin saw *every* user’s report there — now filtered explicitly by `reporter_id`. **Closes Module 5.**
- **2026-06-12 — Batch 6 (gym events lifecycle, P1):** migrations `0012`/`0013`. `events.status`
  (draft/published/cancelled) + `created_by`/`cancelled_at`; events RLS (published-at-verified-gym public,
  owner/admin manage). **`create_event`** (owner + verified gym), **`update_event`** (allowed only until the
  first reservation), **`cancel_event`** (cancels + refunds every Confirmed attendee to wallet credits +
  notifies — 8-AC5), **`event_analytics`** (reservations / attended / new-to-gym / revenue — 8.4/8-AC6).
  Client: partner **EventsManager** (list + create/edit/cancel/stats) in the gym manage screen, an
  `event-new` create/edit form, and an **“Events here”** section on the member gym-detail page (8.2). **Review →
  fixed (mig `0013`):** the verification gate was missing for events — `create_booking` and
  `create-payment-order` (v5) now reject a non-`published` event (a cancelled/draft event was still bookable
  by id, the twin of the gym-status hole); plus the event-detail screen now shows a clean “Event cancelled”
  state instead of a raw error. Verified live (rolling-back: create → edit-before/blocked-after-reservation →
  stranger-blocked → analytics=1 → cancel refunds +300); `typecheck` green; advisor clean. **Closes Module 8
  core.** Remaining: nearby-event push (needs-creds), no-show strikes + 24h/1h reminders (need real event
  datetimes + cron), per-event cancel cutoff.
- **2026-06-12 — Batch 7 (wallet & credits, P1):** migrations `0014`/`0015`. **6-month credit expiry**
  (`credit_ledger.expires_at` + `stamp_credit_expiry` trigger stamps every earned-credit insert path),
  **goodwill/support issuance** (`issue_goodwill` admin RPC + a "Goodwill" action in the support queue),
  **expiry reminders** ~7 days out (`dispatch_expiring_credits` on a daily pg_cron job), and **GST breakdown**
  at checkout + event detail (`gstSplit`, 18% incl.). Wallet shows per-entry expiry labels + an expiring-soon
  banner. **Adversarial review → fixed (mig `0015`, critical):** the naive `sum(non-expired)` balance
  double-subtracted a credit that was *spent before it expired* (the spend row persists, the grant drops out),
  silently zeroing valid credits — corrected to `max(0, min(lifetime-net, non-expired-earned))` on both server
  and client (valid since all credits share one 6-month window → expiry order = FIFO); the expiring-soon banner
  is now clamped to the available balance and the reminder is per-user + spend-aware; fixed an `expiryLabel`
  off-by-one that showed “expires today” for up to 24h after expiry. Verified live (spent-then-expired = 300 not
  0); `typecheck` green; advisor clean. **Closes Module 7** (cash→source refund remains needs-creds).

## Legend

| Mark | Meaning |
|---|---|
| `[x]` ✅ | **Done** — built and wired exactly as the PRD specifies (server-enforced where money/capacity/ownership is implied) |
| `[ ]` 🟡 | **Partial** — present but weaker than spec or not enforced |
| `[ ]` 🟦 | **Simulated** — a stub/fake stands in for a real integration |
| `[ ]` ⛔ | **Missing** — not implemented |

External integrations follow the repo's existing pattern (see `create-payment-order`):
code ships complete but **degrades gracefully** when its secret is absent, and is marked
`needs-creds` until credentials are configured.

---

## Progress summary

| Module | Priority | ✅ | 🟡 | 🟦 | ⛔ |
|---|---|--:|--:|--:|--:|
| 1.1 Gym Discovery | P0 | 1 | 5 | 0 | 2 |
| 1.2 Booking & Payment | P0 | 4 | 6 | 0 | 1 |
| 1.3 Check-in | P0 | 5 | 1 | 0 | 0 |
| 2 Crowd Tracking | P0 | 7 | 0 | 0 | 0 |
| 3 Partner Onboarding/Mgmt | P0 | 9 | 3 | 0 | 0 |
| 4 Trainer Marketplace | P1 | 0 | 2 | 1 | 6 |
| 5 Trust/Ratings/Support | P0-lite | 7 | 0 | 0 | 0 |
| 6 Notifications | P0 | 7 | 2 | 0 | 1 |
| 7 Wallet & Credits | P1 | 7 | 1 | 0 | 0 |
| 8 Events | P1 | 7 | 2 | 0 | 1 |

---

## Module 1 — User App: Discovery & Booking (P0)

### 1.1 Gym discovery
- [ ] 🟡 **1.1-REQ1** List + map with distance, price/slot, rating, live crowd, **open/closed status** — _add open/closed derived from timings; surface on card_
- [ ] 🟡 **1.1-REQ2** Filters: **distance radius**, **price range**, crowd, amenities, **"available now"** — _crowd+amenity+sort exist; add the rest_
- [ ] 🟡 **1.1-REQ3** Detail page: photos, equipment, timings, rules, **directions**, reviews, **slot grid preview** — _add directions link + slot preview_
- [ ] 🟡 **1.1-AC1** Gyms within configurable radius (default 5 km), sorted by distance, <3 s on 4G — _add radius filter (load-time is perf, not code)_
- [x] ✅ **1.1-AC2** Crowd shows Low/Moderate/High/Full or "Not available" — `CrowdBadge` + `crowdLabel`
- [ ] ⛔ **1.1-AC3** Gym with no slots today is clearly marked but still discoverable — _add per-gym today-availability badge_
- [ ] 🟡 **US** See gyms near me with price/slot + live crowd — _depends on radius filter_

### 1.2 Slot booking & payment
- [x] ✅ **1.2-REQ1** Slot grid per gym/day (30/60) with price + remaining capacity — `slot_availability` RPC
- [x] ✅ **1.2-REQ2** Flow: slot → optional trainer → pay → QR confirmation
- [ ] 🟡 **1.2-REQ3** UPI/cards/netbanking/wallets via gateway; INR; **GST-compliant invoices** — _real Razorpay for slots; add GST breakdown + invoice_
- [ ] 🟡 **1.2-REQ4** Free-cancel window (configurable, default 2 h, server-enforced); source vs credits; no-show = no refund — _enforce window server-side_
- [ ] 🟡 **1.2-REQ5** Upcoming/past, **reschedule**, cancel — _add reschedule flow + RPC_
- [x] ✅ **1.2-AC1** Capacity decrements **atomically**; no overbooking under concurrency — `create_booking` row-lock guard (mig `0006`), concurrency-tested
- [ ] ⛔ **1.2-AC2** Payment failure releases slot hold within 10 min — _add hold/expiry + cleanup_
- [ ] 🟡 **1.2-AC3** Cancel inside free window auto-initiates refund within 24 h — _wire Razorpay refund for source path_
- [ ] 🟡 **1.2-AC4** Confirmation in-app **and** via SMS/WhatsApp — in-app confirmation now fires from `create_booking` (Module 6); SMS/WhatsApp is code-complete `needs-creds` (Twilio)
- [x] ✅ **US** Book 30/60-min slot today/coming days; pay instantly
- [ ] 🟡 **US** Cancel/reschedule within policy + automatic refund — _reschedule + source refund_

### 1.3 Check-in
- [x] ✅ **1.3-REQ1** QR per booking; gym scans **or 6-digit OTP fallback** — `checkin_code` on each booking, shown on ticket; partner `Enter code` → `partner_checkin_by_code` (mig `0007`/`0007b`)
- [x] ✅ **1.3-REQ2** Check-in valid only within slot window (+10 min grace) — server-enforced via `starts_at`/`ends_at` in `checkin`/`partner_checkin`; verified live
- [x] ✅ **1.3-AC1** QR cannot be reused after successful check-in — status `Confirmed`→`Completed`
- [x] ✅ **1.3-AC2** Outside-window check-in rejected w/ clear message + **gym override** — distinct "opens in 10 min"/"window passed" errors; partner "Force check-in (override)"
- [x] ✅ **US** QR/OTP check-in smooth + verified
- [ ] 🟡 **Extra** Auto check-out at slot end + manual check-out — manual `checkout` RPC + ticket button ✅; crowd auto-decays via time-bounded occupancy; _scheduled `checked_out` flag (pg_cron) pending_

---

## Module 2 — Crowd Tracking v1 (P0)
- [x] ✅ **2-REQ1** Occupancy = live check-ins (not yet checked-out, in-window) + gym walk-in count; staff quick-update widget — `walkins` col, `partner_set_walkins`, partner level widget, `checkout` (mig `0007`)
- [x] ✅ **2-REQ2** Crowd = occupancy ÷ effective capacity, bucketed Low<40/Mod40-70/High70-95/Full>95 — `recompute_crowd()` over `effective_capacity`; _thresholds are in-code constants (not yet a settings table)_
- [x] ✅ **2-REQ3** Staleness: "Updated X ago"; degrade to "Not available" after cutoff — timestamp display + `mapGym` degrades readings >90 min to Unknown
- [x] ✅ **2-AC1** Crowd updates within 1 min of check-in/out/manual update — `recompute_crowd` runs in `checkin`/`checkout`/`partner_checkin`/`partner_set_*`
- [x] ✅ **2-AC2** Every crowd indicator shows "last updated" — discover cards + gym detail show timestamp; _map pin callout pending (minor)_
- [x] ✅ **2-AC3** Gyms update crowd in ≤2 taps from dashboard — partner Low/Moderate/High/Full widget → `partner_set_crowd`
- [x] ✅ **US (owner)** Quickly update crowd (or auto-derived) — manual widget + auto recompute on check-ins

---

## Module 3 — Gym Partner Onboarding & Management (P0)
- [x] ✅ **3.1** Self-serve signup + admin verification before live — `create_gym` wizard (`app/partner/register.tsx`: basics, amenities/hours, slot config + pricing, `gym_kyc` bank/KYC) → `pending`; `verify_gym` admin gate (`app_admins`). _Photos are a cover-URL field (no upload pipeline); address is area/city (no pincode field) — minor_
- [x] ✅ **3.2** Slot config (30/60, price, peak/off-peak, max-per-slot, blackout dates) — `create`/`update`/`delete_slot` + `add`/`remove_blackout` in the manage screen; blackout enforcement fixed (mig `0010`, IST date)
- [ ] 🟡 **3.3** Dashboard: today's bookings + scanner, **earnings**, **crowd quick-update** ✅; _calendar view, settlement statements, reviews-in-dashboard pending_
- [ ] 🟡 **3.4** Payouts: payout = price − commission ✅ (`partner_settlement` from `payments`); _weekly settlement cycle + downloadable statements + Razorpay Route transfer (needs-creds)_
- [x] ✅ **3-AC1** Signup <20 min with docs — enabled by the wizard (time is a process target)
- [x] ✅ **3-AC2** No gym publicly listed before admin verification — gyms RLS (verified-only public) + `create_booking`/`create-payment-order` reject non-verified gyms + slots RLS scoped (mig `0009`/`0010`); verified live
- [ ] 🟡 **3-AC3** Settlements reconcile: bookings − refunds − commission = payout/cycle — gross − commission = payout shown; _refund-netting + per-cycle reconciliation pending_
- [x] ✅ **US** Register gym w/ photos/equipment/timings/capacity — registration wizard
- [x] ✅ **US** Define slot duration/price/peak/max-per-slot — slot CRUD
- [x] ✅ **US** Verify check-ins via QR — `partner_checkin` (+ OTP fallback, Module 1.3)
- [x] ✅ **US** Dashboard of bookings/earnings/settlement — partner dashboard + settlement card
- [x] ✅ **US** Block slots for maintenance/holidays — blackout dates (enforced via mig `0010`)

---

## Module 4 — Personal Trainer Marketplace (P1)
- [ ] 🟡 **4.1** Trainer signup & verification (profile, certs upload, specializations, experience, languages, fee 30/60, **service radius**, **availability calendar**) + doc/background check — _build trainer app + schema columns + verification_
- [ ] 🟦 **4.2** Request & matching flow (fee range shown; fee **held** not captured; broadcast to verified+in-radius+free trainers; first-accept atomic; both notified w/ goal note; cutoff auto-refund; trainer check-in; payout) — _build full matching state machine_
- [ ] ⛔ **4.2-AC1** Request only to verified, in-radius, free trainers — _eligibility query_
- [ ] ⛔ **4.2-AC2** Exactly one trainer assigned (atomic accept; later → "already taken") — _atomic accept RPC_
- [ ] ⛔ **4.2-AC3** Unmatched → auto-refund trainer fee, no user action — _cutoff job + refund_
- [ ] ⛔ **4.2-AC4** Mutual details only after assignment (name/photo/goal; no phone; masked) — _add goal note + post-assignment reveal_
- [ ] ⛔ **4.3** Trainer reliability: cancel → re-broadcast/refund; repeated → ranking down + suspend — _reliability tracking_
- [ ] ⛔ **US (trainer)** Profile / availability+radius / accept-decline / auto payout / ratings+history — _entire trainer app_
- [ ] 🟡 **US (goer)** Optionally add trainer; if none accepts, notified + refunded — _depends on matching_

---

## Module 5 — Trust, Ratings & Support (P0-lite)
- [x] ✅ **5.1** Gym rating 1–5 + optional comment, gated to members who booked — `submit_review`
- [x] ✅ **5.2** Gym review tags (cleanliness, equipment, crowd accuracy) — `reviews.tags` + whitelist in `submit_review`; tag chips in `ReviewsSection` (mig `0011`)
- [x] ✅ **5.3** Trainer rating 1–5 + tags (punctuality, knowledge, behavior) — `trainer_reviews` + `submit_trainer_review` (gated to a completed session); `TrainerRatingSheet` from completed trainer bookings
- [x] ✅ **5.4** Report/flag flow (user↔trainer, user↔gym) — `reports` table + `submit_report`; `app/report.tsx`; report links on gym detail
- [x] ✅ **5.5** Support escalation for flagged reports — report `status` machine + admin-gated `resolve_report`; admin **support queue** in `app/help.tsx` (open→resolved/dismissed)
- [x] ✅ **5.6** In-app help center (FAQs) — `app/help.tsx` FAQ accordion + your-reports status
- [x] ✅ **5.7** WhatsApp support channel — `wa.me` deep-link from help (support number is a config placeholder)

---

## Module 6 — Notifications (P0)
- [x] ✅ **6.1** Booking confirmation — `enqueue_notification` from `create_booking` (mig `0008`); in-app + push-tagged
- [x] ✅ **6.2** Slot reminder ~1 h before — `dispatch_due_reminders()` on **pg_cron** (every 5 min), deduped via `bookings.reminded_at`
- [ ] ⛔ **6.3** Trainer accepted/unmatched — _hook-ready (`trainer_assigned`/`trainer_unmatched` types + category exist); wiring awaits the trainer flow (Module 4)_
- [x] ✅ **6.4** Refund status — `enqueue_notification` from `cancel_booking` (credit vs source wording server-side)
- [x] ✅ **6.5** Gym-side new-booking alert — owner fan-out loop in `create_booking` (`gym_new_booking`, `partner` category)
- [ ] 🟡 **6.6** Push channel (Expo push via EAS + expo-notifications) — `needs-creds`: code-complete (user-aware `src/lib/push.ts` + `register_push_token` RPC + Edge Function); inert until a device build + delivery secrets
- [ ] 🟡 **6.7** SMS/WhatsApp fallback (Twilio) — `needs-creds`: code-complete in `send-notification` Edge Function; inert until Twilio secrets
- [x] ✅ **6.8** In-app Notifications screen + records — `app/notifications.tsx` + `notifications` table; live via Supabase Realtime; bell + unread badge on Discover/Profile
- [x] ✅ **6.9** Notification records with status (sent/failed/read) — `notifications.status` + `dispatched_at`; read via `mark_notification_read`/`mark_all_notifications_read`
- [x] ✅ **6.10** Notification preferences per event type — `notification_prefs` (6 categories + push/sms) via `get/set_notification_pref`; `app/notification-prefs.tsx`

---

## Module 7 — Wallet & Credits (P1)
- [x] ✅ **7.1-A** Ledger earned via cancel→credits+5%, **goodwill/support**, promo — `issue_goodwill` admin RPC (mig `0014`) + support-queue action
- [x] ✅ **7.1-B** Credits usable on any slot/trainer/paid event; partial pay (credits + cash) — server-enforced
- [x] ✅ **7.1-C** Non-withdrawable/non-transferable; **expiry default 6 months** — `expires_at` + `stamp_credit_expiry` trigger; `credit_balance` = `max(0, min(net, non-expired earned))` (mig `0014`/`0015`, FIFO-correct)
- [ ] 🟡 **7.1-D** Refund hierarchy: credit portion → credits; cash portion → chosen method — credit-portion → credits ✅; cash → source = `needs-creds` (Razorpay refund)
- [x] ✅ **7-AC1** Offer source vs instant credits (+bonus); credits reflect immediately
- [x] ✅ **7-AC2** Checkout shows credits applied + payable; **GST breakdown** — `gstSplit` (18% incl.) base+GST lines on checkout + event detail
- [x] ✅ **7-AC3** Every ledger entry has reason code + reference (auditable)
- [x] ✅ **7-AC4** Expiring credits → reminder ~7 days before — `dispatch_expiring_credits` (per-user, spend-aware) on a daily **pg_cron** job

---

## Module 8 — Gym Events & Hosted Sessions (P1)
- [x] ✅ **8.1** Gym-side create / edit (until 1st reservation) / cancel (auto-refund all + notify); free = no fee; moderation — `create_event`/`update_event`/`cancel_event` (mig `0012`) + partner **EventsManager** + `event-new` form; status draft/published/cancelled
- [ ] 🟡 **8.2** Events tab+map + on gym detail; nearby push; paid→gateway→QR ✅; free→one-tap→QR ✅; per-user limit ✅; cancel/refunds ✅ — ✅ **events on gym detail**; _nearby push = needs-creds; per-event cancel cutoff pending_
- [ ] ⛔ **8.3** Free-event no-show control: reminders 24 h/1 h; 3 strikes/90 days — _needs real event datetimes + cron (events store text date/time labels); deferred_
- [x] ✅ **8.4** Event analytics: reservations vs attendance, **new-to-gym count** — `event_analytics` RPC + partner "Stats" view
- [x] ✅ **8-AC1** Create+publish event ≤5 min from dashboard — `event-new` form (process target)
- [x] ✅ **8-AC2** Free events skip payment but issue QR + count against capacity — one-tap `createBooking`; capacity server-enforced (mig `0006`)
- [x] ✅ **8-AC3** Reservations cannot exceed capacity (atomic) — event row-lock guard in `create_booking`
- [ ] 🟡 **8-AC4** Nearby opted-in users ≤N notifications/week — `needs-creds` (push) + `event_nearby` type ready; cap logic pending
- [x] ✅ **8-AC5** Cancel event auto-refunds/credits all attendees + notifies — `cancel_event` (credits all Confirmed bookings + `refund_status` notification); verified live
- [x] ✅ **8-AC6** Post-event: attendance vs reservations + first-time-visitor count — `event_analytics` (reservations/attended/new-to-gym/revenue)

---

## Cross-cutting

- **Atomic capacity** (1.2-AC1 / 8-AC3) is the single highest-risk correctness gap — fix first.
- **Notifications (Module 6)** dispatch core is **built** (`enqueue_notification` + prefs + pg_cron, mig `0008`). Remaining modules just call `enqueue_notification(...)` to notify: trainer 4.x (6.3), credit-expiry 7-AC4 (`credit_expiry` type ready), event reminders/strikes 8.3, event cancel 8-AC5. Push/SMS providers are `needs-creds` (flip on by setting secrets + the Vault/pg_net flush worker).
- **Non-code acceptance criteria** (load <3 s on 4G, signup <20 min, create event ≤5 min) are performance/process targets — tracked but verified by manual QA, not code.
- **Personas:** Gym-goer ≈ near-complete; **Gym-owner now has self-serve onboarding + management** (Module 3 core done); Trainer is greenfield (no app yet — next P1 module).

## Implementation phases (P0 first)

1. **DB foundation** — one migration set: capacity guards, check-in windows + OTP + checkout, crowd computation + manual update, blackout dates, gym `verified`, settlement, trainer schema + matching, events lifecycle + per-user limit, notifications + prefs, reports, review tags, trainer reviews, credit expiry. Regenerate `database.types.ts`.
2. **User app gaps** — discovery filters + open/closed + availability badge, reschedule, OTP entry, GST, event gateway routing + per-user limit, notifications screen, help center, report flow, review tags.
3. **Partner app** — signup wizard + KYC + verification gate, slot/blackout config, crowd widget, calendar, settlement statements, event CRUD + analytics, OTP share.
4. **Trainer app** — signup/profile, availability+radius, request inbox + accept/decline, payouts, ratings/history.
5. **Integrations (`needs-creds`)** — push (expo-notifications/EAS), SMS/WhatsApp (Twilio edge fn), Razorpay refunds + Route payouts. Ship behind graceful fallbacks.
