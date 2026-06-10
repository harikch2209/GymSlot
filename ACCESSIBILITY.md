# Accessibility

GymSlot targets WCAG 2.1 AA-equivalent guidance for mobile and the platform
accessibility requirements for the App Store and Google Play.

## What's implemented

- **Screen readers (VoiceOver / TalkBack).** Interactive primitives in
  `src/components/ui.tsx` set `accessibilityRole`, `accessibilityLabel`, and
  `accessibilityState` (selected / disabled / busy). Gym cards, slots, chips, tabs,
  payment options, and buttons announce meaningful labels (e.g. a slot reads
  "06:00, 30 minutes, ₹139, 8 spots left").
- **Touch targets.** Buttons are 40–54px tall; menu rows are ≥56px; chips and radios meet
  the ~44px guidance.
- **Contrast.** Near-black ink (`#0E1116`) and emerald (`#10B981`) on white surfaces meet
  AA for body text and UI. Status/crowd colors are paired with text labels, never color
  alone (color is never the sole signal).
- **Typography.** Inter with a deliberate type scale; line-heights set for readability.
- **Motion.** Animations are short, functional transitions (image cross-fade, button press
  scale) — no parallax or essential motion. Haptics are additive, not required.
- **Forms.** Inputs have visible labels, error text (not color-only), correct keyboard
  types, and `textContentType`/`autoComplete` for autofill.

## Known gaps / roadmap

- **Dynamic Type / font scaling:** the type scale is fixed in v1. Respecting OS font-size
  settings end-to-end is planned.
- **Reduce Motion:** wire `AccessibilityInfo.isReduceMotionEnabled()` to disable the press
  scale and image transitions.
- **Full audit:** a device pass with VoiceOver and TalkBack on every screen before store
  submission (see `docs/DEPLOYMENT.md` checklist).

## Testing

- iOS: Settings → Accessibility → VoiceOver. Swipe through each screen; confirm labels and
  order.
- Android: Settings → Accessibility → TalkBack. Same sweep.
- Contrast: verify against WebAIM ratios when changing `src/theme.ts` colors.
