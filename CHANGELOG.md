# Changelog

## 1.0.0 — 2026-06-10

Production rebuild: from in-memory prototype to a real, backed, store-ready app.

### Added
- **Supabase backend** (dedicated project `gymslot`, ap-south-1): Postgres schema with
  Row Level Security, `SECURITY DEFINER` RPCs for all booking/wallet mutations, generated
  TypeScript types, and seed data with real imagery. Migrations in `supabase/`.
- **Authentication**: email/password sign-up & sign-in (Supabase Auth), session persistence,
  auth-gated navigation, ₹250 welcome credits on first sign-in.
- **Premium light UI**: Cult.fit-inspired design system (`DESIGN.md`) — emerald accent, Inter
  type scale, soft elevation, Ionicons, and real photography via `expo-image`. New component kit.
- **Real data layer**: `src/lib/api.ts` over Supabase with `useResource` hook (loading/error/
  pull-to-refresh). Bookings, wallet, and crowd/slot availability are now live.
- **Store readiness**: generated app icon/adaptive/splash/favicon (`scripts/generate-icons.mjs`),
  full `app.json`, `eas.json` build+submit profiles, and `docs/` (deployment + store listing).
- **Docs**: `PRIVACY_POLICY.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `DESIGN.md`, updated
  `README.md` and `CLAUDE.md`.
- **Accessibility**: screen-reader roles/labels/states, ≥44px targets, AA contrast, label+color
  (never color alone) for status.

### Changed
- Replaced the in-memory `AppContext` store with Supabase-backed bookings + wallet.
- Dark prototype theme → light production design system.
- Emoji placeholders → real remote images for gyms, trainers, and events.

### Notes
- Payments remain **simulated** (no gateway); the booking/credit logic behind checkout is real
  and server-validated. Razorpay/real-gateway integration is the next step for live transactions.
