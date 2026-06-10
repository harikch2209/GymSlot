# Privacy Policy — GymSlot

_Last updated: 10 June 2026_

GymSlot ("we", "us") operates the GymSlot mobile application (the "App"). This policy
explains what we collect, why, and your choices. We aim to collect the minimum needed
to run a pay-per-slot gym booking service.

## Who is responsible

The data controller is the GymSlot operator. Contact: **harikch97@gmail.com**.

## What we collect

| Data | Why | Where it's stored |
|---|---|---|
| **Email address** | Account sign-in and account recovery | Supabase Auth |
| **Name** | Personalising the app and your bookings | Supabase (`profiles`) |
| **Password** | Authentication. Stored only as a salted hash by Supabase Auth — never in plain text, never visible to us | Supabase Auth |
| **Bookings** (gym, slot, date, amount, trainer) | To show and manage your bookings and check-ins | Supabase (`bookings`) |
| **Wallet/credit ledger** | To track credits earned and spent | Supabase (`credit_ledger`) |
| **Session token** | To keep you signed in | On your device (encrypted at rest by the OS keystore via the app's secure storage) |

We do **not** collect precise GPS location, contacts, photos, health/biometric data,
advertising identifiers, or device microphone/camera data. The "Bengaluru" location shown
in the App is a static label in this version, not your real location.

## What we do not do

- We do **not** sell or rent your personal data.
- We do **not** use third-party advertising or analytics SDKs in this version.
- We do **not** process real payments in this version. Checkout is simulated; no card,
  UPI, or bank details are collected or transmitted.

## How data is used

Only to provide the service: authenticate you, show gyms/events, create and manage
bookings, and maintain your wallet balance. Business rules (credits, refunds) run on our
secure backend so amounts can't be tampered with from the client.

## Sharing & sub-processors

We use **Supabase** (database, authentication, hosting) as a sub-processor. Data is stored
in Supabase's Mumbai (ap-south-1) region. Gym/trainer/event images are loaded from
**Unsplash** image URLs; loading an image shares your IP address with that CDN, as with any
web image. We share data with authorities only if legally required.

## Data retention

Account and booking data is retained while your account is active. When you delete your
account, your `profiles`, `bookings`, and `credit_ledger` rows are removed (they cascade
from your auth user). Email us to request deletion.

## Your rights

Depending on your jurisdiction (including India's DPDP Act and the GDPR) you may access,
correct, export, or delete your data, and withdraw consent. To exercise these, email
**harikch97@gmail.com**. We respond within 30 days.

## Security

Row Level Security isolates every user's data at the database level; transport is encrypted
with TLS; session tokens are kept in the device's secure storage. See `SECURITY.md`.

## Children

GymSlot is not directed to children under 13 (or the minimum age in your region). We do not
knowingly collect their data.

## Changes

We'll update this page and the "Last updated" date for material changes.

## Contact

**harikch97@gmail.com**
