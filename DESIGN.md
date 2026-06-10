# Design System — GymSlot

> Source of truth for visual decisions. Always read this before changing UI.
> Tokens live in `src/theme.ts`; this document explains the *why*.

## Product Context
- **What this is:** A pay-per-slot gym booking app (iOS / Android / Web) for the Indian market.
- **Who it's for:** Urban gym-goers who want to pay only for sessions they attend, see live crowd levels, and book in under a minute.
- **Space/peers:** Cult.fit, Fitpass, Playo (turf booking). Consumer fitness marketplace.
- **The one thing to remember:** "Booking a workout is as easy and as nice as ordering food."

## Aesthetic Direction
- **Direction:** Clean, premium, light — Cult.fit-inspired.
- **Decoration level:** Intentional. Real photography does the heavy lifting; chrome stays quiet.
- **Mood:** Bright, energetic, trustworthy. White space, soft depth, one confident accent.
- **Memorable choices (the risks):**
  - **Photo-forward cards with an overlaid live-crowd pill** — no competitor surfaces real-time crowd this prominently on the card itself.
  - **Emerald as the single brand accent** on an otherwise near-monochrome canvas — most fitness apps reach for red/orange; emerald reads "go / active / healthy" and owns a lane.
  - **Near-black (`ink`) primary CTAs** rather than colored buttons — keeps the accent meaningful and the UI calm.

## Typography
- **Family:** Inter (via `@expo-google-fonts/inter`), loaded in `app/_layout.tsx`.
- **Display/Hero:** `Inter_900Black`, -0.6 tracking — welcome hero, big numbers.
- **Headings:** `Inter_800ExtraBold` / `Inter_700Bold`, negative tracking for tightness.
- **Body:** `Inter_400Regular`; emphasis via `Inter_600SemiBold`.
- **Labels/overlines:** `Inter_700Bold`, +0.8 tracking, uppercase.
- **Scale:** display 32 · h1 26 · h2 21 · h3 17 · body 15 · small 13 · tiny 11 (see `type` in theme.ts).

> Inter is normally on our "overused" list, but it's deliberate here: it ships free for
> commercial use, has the full weight range we need for a tight type scale, and renders
> crisply on low-DPI Android. The personality comes from photography + accent, not the typeface.

## Color
- **Approach:** Restrained. One accent + neutrals; color is rare and meaningful.
- **Background:** `#FFFFFF` surfaces on a `#F4F6F8` page.
- **Ink (text + dark CTAs):** `#0E1116` / `#111418`.
- **Primary accent:** Emerald `#10B981` (dark `#0E9F6E`, tint `#E7F8F1`).
- **Secondary:** Indigo `#6366F1` for events.
- **Semantic:** success `#10B981`, warning `#F59E0B`, danger `#EF4444`, star `#F59E0B`.
- **Crowd buckets:** Low emerald, Moderate amber, High rose `#FB7185`, Full red, Unknown gray.
- **Dark mode:** Not shipped in v1 (StatusBar is dark-on-light). Token structure leaves room to add it.

## Spacing
- **Base unit:** 4px. Scale: xs4 · sm8 · md12 · lg16 · xl24 · xxl32 · xxxl48.
- **Density:** Comfortable. Cards breathe; screens use `lg` (16) gutters.

## Layout
- **Approach:** Grid-disciplined app shell with photo-led hero moments.
- **Cards:** radius `lg` (20), soft shadow (`shadow.sm/md`), full-bleed image headers.
- **Border radius scale:** sm10 · md14 · lg20 · xl28 · pill999.
- **Sticky CTAs:** Detail/booking/checkout screens pin the primary action to the bottom with a hairline top border.

## Motion
- **Approach:** Minimal-functional + tactile. `expo-image` cross-fades (250ms); buttons scale to 0.985 and fire light haptics on press; chips fire selection haptics.

## Accessibility
- Targets ≥44px, AA contrast on ink/emerald against white, `accessibilityRole`/`Label`/`State`
  on all interactive primitives (see `src/components/ui.tsx`).

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-10 | Light Cult.fit-style system, emerald accent, Inter, real photography | User-chosen direction for the production rebuild |
| 2026-06-10 | Near-black CTAs, accent reserved for highlights/crowd | Keeps one accent meaningful; calmer premium feel |
