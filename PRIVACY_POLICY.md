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
| **Approximate location** (only with your permission) | To show gyms near you and distances, and your position on the map | Used on-device in the moment; **not stored** on our servers, never tracked or shared |
| **Camera** (gym partners only, with permission) | To scan a member's QR ticket to check them in | Processed on-device to read the QR; **no images are stored or uploaded** |
| **Payment metadata** (Razorpay order/payment IDs, amount) | To confirm a booking was paid and record the gym's payout | Supabase (`payments`). **We never receive or store your card/UPI/bank details** — Razorpay handles those |

Location is **approximate and optional** — if you decline the permission, the app falls back to a
city-centre and still works. We do **not** collect contacts, photos, health/biometric data,
advertising identifiers, microphone data, or background location. The camera is used only by gym
partners to read a check-in QR, on-device; no photos are captured or uploaded.

## What we do not do

- We do **not** sell or rent your personal data.
- We do **not** use third-party advertising or analytics SDKs in this version.
- We do **not** collect, see, or store your card, UPI, or bank details. Payments are processed by
  **Razorpay**; you enter payment details directly into Razorpay's secure checkout, not into GymSlot.

## How data is used

Only to provide the service: authenticate you, show gyms/events, create and manage
bookings, and maintain your wallet balance. Business rules (credits, refunds) run on our
secure backend so amounts can't be tampered with from the client.

## Sharing & sub-processors

We use the following sub-processors:
- **Supabase** (database, authentication, Edge Functions, hosting) — data stored in the Mumbai
  (ap-south-1) region.
- **Razorpay** (payment processing) — when you pay, your payment details and amount are processed by
  Razorpay under their privacy policy. We receive only a payment confirmation and IDs.
- **Unsplash** (gym/trainer/event imagery) — loading an image shares your IP with that CDN, as with
  any web image.

We share data with authorities only if legally required.

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
