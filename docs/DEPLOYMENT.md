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
- [ ] Privacy Policy URL live and linked in both stores
- [ ] Play **Data safety** form filled (answers in `docs/STORE_LISTING.md`)
- [ ] Apple **App Privacy** "Nutrition label" filled (answers in `docs/STORE_LISTING.md`)
- [ ] Screenshots for 6.7" + 6.1" iPhone and Android phone uploaded
- [ ] `version` / `buildNumber` / `versionCode` bumped (production profile auto-increments)

## OTA updates

`runtimeVersion.policy = "appVersion"` is set. JS-only changes can ship without a store
review via `eas update --channel production` once you've run `eas update:configure`.
