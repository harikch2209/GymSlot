import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchBooking, fetchSlotsWithAvailability, rescheduleBooking } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useApp } from '@/context/AppContext';
import { AppText, Button, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Slot } from '@/types';
import { inr } from '@/utils/format';
import { slotStartIso, upcomingDays } from '@/utils/schedule';

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const booking = useResource(() => fetchBooking(id), [id]);
  const gymId = booking.data?.gymId ?? null;

  const DAYS = useMemo(() => upcomingDays(4), []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const slotsRes = useResource(
    () => (gymId ? fetchSlotsWithAvailability(gymId, DAYS[day].label) : Promise.resolve<Slot[]>([])),
    [gymId, day],
  );
  const slots = slotsRes.data ?? [];

  const submit = async () => {
    if (!slot || !booking.data) return;
    setBusy(true);
    try {
      await rescheduleBooking({
        bookingId: id, slotId: slot.id, date: DAYS[day].label, time: slot.time,
        startsAt: slotStartIso(DAYS[day].date, slot.time), title: `${slot.time} · ${slot.duration} min`,
        durationMins: slot.duration,
      });
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Could not reschedule', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  if (booking.loading) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={24} width="55%" /><Skeleton height={90} /><Skeleton height={160} /></View></View>;
  }
  if (!booking.data || booking.data.kind !== 'slot' || booking.data.status !== 'Confirmed') {
    return <View style={[styles.container, { justifyContent: 'center' }]}>
      <EmptyState icon="calendar-outline" title="Can’t reschedule this booking"
        body="Only upcoming slot bookings can be rescheduled." /></View>;
  }

  // Same-price reschedules only (server-enforced). For no-trainer bookings we can
  // disable mismatched slots up front; trainer bookings fall back to the server check.
  const targetPrice = booking.data.trainerId ? null : booking.data.amountPaid + booking.data.creditsUsed;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 130 }}>
        <AppText variant="small" color={colors.textMuted}>
          Rescheduling “{booking.data.title}” at {booking.data.gymName} to a same-price slot. Free until 2 hours before your current slot.
        </AppText>

        <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>New day</AppText>
        <View style={styles.dayRow}>
          {DAYS.map((d, i) => (
            <Pressable key={d.label} onPress={() => { setDay(i); setSlot(null); }}
              accessibilityRole="button" accessibilityState={{ selected: day === i }}
              style={[styles.dayChip, day === i && styles.dayChipActive]}>
              <AppText variant="smallStrong" color={day === i ? colors.onPrimary : colors.textMuted}>{d.label}</AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.slotHeader}>
          <AppText variant="h3">New slot</AppText>
          {slotsRes.loading && <AppText variant="small" color={colors.textSubtle}>Checking availability…</AppText>}
        </View>
        <View style={styles.slotGrid}>
          {slots.map((s) => {
            const wrongPrice = targetPrice != null && s.price !== targetPrice;
            const full = s.remaining <= 0 || wrongPrice;
            const selected = slot?.id === s.id;
            return (
              <Pressable key={s.id} disabled={full} onPress={() => setSlot(s)}
                accessibilityRole="button" accessibilityState={{ selected, disabled: full }}
                style={[styles.slot, full && styles.slotFull, selected && styles.slotSelected]}>
                <AppText variant="bodyStrong" color={selected ? colors.onPrimary : colors.text}>{s.time}</AppText>
                <AppText variant="tiny" color={selected ? 'rgba(255,255,255,0.85)' : colors.textSubtle}>{s.duration} MIN</AppText>
                <AppText variant="smallStrong" color={selected ? colors.onPrimary : colors.primary} style={{ marginTop: 2 }}>{inr(s.price)}</AppText>
                <AppText variant="tiny" color={selected ? 'rgba(255,255,255,0.85)' : full ? colors.danger : colors.textSubtle}>
                  {full ? 'Full' : `${s.remaining} left`}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title={slot ? 'Confirm new time' : 'Pick a slot'} icon="swap-horizontal" disabled={!slot} loading={busy} onPress={submit} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  dayRow: { flexDirection: 'row', gap: spacing.sm },
  dayChip: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '31.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 1, ...shadow.sm },
  slotFull: { opacity: 0.4, backgroundColor: colors.surfaceSunken },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
