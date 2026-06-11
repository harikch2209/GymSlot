# Deployment & Store Submission

GymSlot is an Expo (SDK 52) app built and submitted with **EAS**. The Supabase backend is
already provisioned (project `gymslot`, ap-south-1). This guide takes you from a clean clone
to apps in review.

## 0. Prerequisites

- Node 18+ and the repo installed: `npm install`
- An [Expo account](https://expo.dev) (free) and EAS CLI: `npm i -g eas-cli && eas login`
- **Apple Developer Program** ($99/yr) for iOS, **Google Play Console** ($25 one-time) for Android
- `.env` present (copy from `.env.example`; values are in the team vault / Supabase dashboard)

## 1. Backend (already done, here for reproducibility)

The schema, security functions, and seed data live in `supabase/migrations/` and
`supabase/seed.sql`. To recreate on a fresh project with the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push          # applies migrations/0001..0003
psql "$DATABASE_URL" -f supabase/seed.sql   # or run seed.sql in the SQL editor
```

Before launch, in the Supabase dashboard: **Auth → Providers → Email** — turn on
"Confirm email", enable leaked-password protection, and set a password policy.

### Edge Functions + secrets (payments)

The Razorpay flow runs in two Edge Functions (`supabase/functions/`). Deploy them and set the
secret (the **Key Secret never goes in the app or repo**):

```bash
supabase functions deploy create-payment-order --project-ref <ref>
supabase functions deploy verify-payment --project-ref <ref>
supabase secrets set RAZORPAY_KEY_SECRET=your_secret --project-ref <ref>
# RAZORPAY_KEY_ID defaults in code; override with a secret if you rotate it.
```

Client-side, set `EXPO_PUBLIC_RAZORPAY_KEY_ID` in `.env` (publishable, safe to ship).

**Going live with real money:** switch the Razorpay keys from test to live (KYC-verified merchant
account required), and to actually settle each gym's payout use **Razorpay Route** — create a linked
account per gym and add a `transfers` block when creating the order. The commission/payout split is
already computed and stored in the `payments` table.

### Maps key (Android standalone builds only)

Maps work in Expo Go and on iOS (Apple Maps) with no key. For a standalone **Android** build, put a
Google Maps API key in `app.json` → `android.config.googleMaps.apiKey` (placeholder is there).

## 2. Link EAS

```bash
eas init                  # creates the EAS project, writes extra.eas.projectId into app.json
```

This replaces the `REPLACE_WITH_EAS_PROJECT_ID` placeholder automatically.

## 3. Builds

`eas.json` defines three profiles. The Supabase env vars are baked into each build profile,
so EAS cloud builds don't need your local `.env`.

```bash
# Try it on a device first (Expo Go works for most of the app, or a dev build):
eas build --profile development --platform all

# Internal QA build (installable APK / ad-hoc IPA):
eas build --profile preview --platform all

# Production store binaries (.aab for Play, .ipa for App Store):
eas build --profile production --platform all
```

Credentials (keystore, iOS signing) are managed by EAS on first run — accept the prompts to
let EAS generate and store them.

## 4. Submit

Fill the `submit.production` placeholders in `eas.json` (Apple ID, ASC app ID, Team ID; and a
Play service-account JSON at `./play-service-account.json` — gitignored). Then:

```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

iOS lands in App Store Connect (TestFlight first); Android in the Play internal track.

## 5. Store listing

Use the copy and reviewer answers in `docs/STORE_LISTING.md`. You'll also need:
- Screenshots (see the checklist below)
- A hosted Privacy Policy URL — publish `PRIVACY_POLICY.md` (e.g. GitHub Pages) and link it.

## Pre-submission checklist

- [ ] `npm run typecheck` clean
- [ ] App runs on a physical iOS and Android device (sign up → book → check-in → cancel → wallet updates)
- [ ] VoiceOver + TalkBack sweep (see `ACCESSIBILITY.md`)
- [ ] Email confirmation enabled in Supabase Auth
- [ ] `RAZORPAY_KEY_SECRET` set as a Supabase secret; both Edge Functions deployed
- [ ] Razorpay keys switched test → live (+ Route linked accounts) for real payouts
- [ ] Google Maps API key set in `app.json` for the Android build
- [ ] Location & camera permission strings reviewed (set in `app.json`)
- [ ] Privacy Policy URL live and linked in both stores
- [ ] Play **Data safety** form filled (answers in `docs/STORE_LISTING.md`)
- [ ] Apple **App Privacy** "Nutrition label" filled (answers in `docs/STORE_LISTING.md`)
- [ ] Screenshots for 6.7" + 6.1" iPhone and Android phone uploaded
- [ ] `version` / `buildNumber` / `versionCode` bumped (production profile auto-increments)

## Test on a real device without Expo Go (Android APK)

The fastest way to test the *real* app on a phone — no Expo Go, no dev server, not tied to any one
machine — is an EAS **preview** build (it produces an installable `.apk`):

```bash
npm i -g eas-cli
eas login
eas init                         # writes extra.eas.projectId into app.json (one-time)
eas build -p android --profile preview
```

EAS runs the build in the cloud and returns a URL + QR to **download and install the APK** directly.
The Supabase + Razorpay env are baked into the profile (`eas.json`). Free tier includes a monthly
build quota. For iOS you need an Apple Developer account (`eas build -p ios --profile preview` →
TestFlight or an ad-hoc/simulator build).

## Run the dev server in the cloud (Railway → QR in console)

To keep the Expo dev server (for Expo Go) running off your own machine, host it on Railway and read
the QR from the deploy logs. `scripts/cloud-dev.mjs` starts the tunnel and prints a scannable QR to
stdout; `railway.json` wires it up.

1. Create a Railway project from this GitHub repo (it auto-detects Node via Nixpacks).
2. Set environment variables on the service:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_RAZORPAY_KEY_ID`
   - `NPM_CONFIG_PRODUCTION=false` (so `@expo/ngrok` + `qrcode` dev-deps install)
3. Deploy. The start command is `npm run cloud:dev` (from `railway.json`).
4. Open the service **logs** — once you see `SCAN IN EXPO GO`, scan the QR with Expo Go.

Caveats: this runs a **development** server in the cloud (not a production build) — fine for testing,
not for end users. The container must stay running; the first connection triggers a bundle (slow).
Railway may warn "no port detected" — that's expected (connectivity goes through the Expo tunnel, not
an HTTP port). For real distribution, use the Android APK / store builds above.

## OTA updates

`runtimeVersion.policy = "appVersion"` is set. JS-only changes can ship without a store
review via `eas update --channel production` once you've run `eas update:configure`.
