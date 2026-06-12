import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGym, fetchSlotsWithAvailability, fetchTrainers } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Button, Card, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Slot, Trainer } from '@/types';
import { inr } from '@/utils/format';
import { slotStartIso, upcomingDays } from '@/utils/schedule';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const DAYS = useMemo(() => upcomingDays(4), []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [wantTrainer, setWantTrainer] = useState(false);
  const [trainer, setTrainer] = useState<Trainer | null>(null);

  const gymRes = useResource(() => fetchGym(id), [id]);
  const slotsRes = useResource(() => fetchSlotsWithAvailability(id, DAYS[day].label), [id, day]);
  const trainersRes = useResource(fetchTrainers, []);

  const gym = gymRes.data;
  const slots = slotsRes.data ?? [];
  const trainers = trainersRes.data ?? [];

  const trainerFee = wantTrainer && trainer ? (slot?.duration === 30 ? trainer.fee30 : trainer.fee60) : 0;
  const total = (slot?.price ?? 0) + trainerFee;

  const feeRange = useMemo(() => {
    if (!trainers.length) return null;
    const fees = trainers.map((t) => (slot?.duration === 30 ? t.fee30 : t.fee60));
    return { min: Math.min(...fees), max: Math.max(...fees) };
  }, [trainers, slot?.duration]);

  if (gymRes.loading) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={24} width="55%" /><Skeleton height={90} /><Skeleton height={160} /></View></View>;
  }
  if (!gym) {
    return <View style={[styles.container, { justifyContent: 'center' }]}>
      <EmptyState icon="cloud-offline-outline" title="Gym not available" action="Retry" onAction={gymRes.reload} /></View>;
  }

  const proceed = () => {
    if (!slot) return;
    router.push({
      pathname: '/checkout',
      params: {
        gymId: gym.id, gymName: gym.name, gymImage: gym.imageUrl ?? '',
        slotId: slot.id, slotLabel: `${slot.time} · ${slot.duration} min`,
        day: DAYS[day].label, startsAt: slotStartIso(DAYS[day].date, slot.time) ?? '',
        time: slot.time, duration: String(slot.duration), slotPrice: String(slot.price),
        trainerId: wantTrainer && trainer ? trainer.id : '',
        trainerName: wantTrainer && trainer ? trainer.name : '',
        trainerFee: String(trainerFee),
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 130 }}>
        <View style={styles.gymRow}>
          <Image source={{ uri: gym.imageUrl ?? undefined }} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <AppText variant="h3">{gym.name}</AppText>
            <AppText variant="small" color={colors.textMuted}>{gym.area}</AppText>
          </View>
        </View>

        <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Select day</AppText>
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
          <AppText variant="h3">Select slot</AppText>
          {slotsRes.loading && <AppText variant="small" color={colors.textSubtle}>Checking availability…</AppText>}
        </View>
        <View style={styles.slotGrid}>
          {slots.map((s) => {
            const full = s.remaining <= 0;
            const selected = slot?.id === s.id;
            return (
              <Pressable key={s.id} disabled={full} onPress={() => setSlot(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.time}, ${s.duration} minutes, ${inr(s.price)}, ${full ? 'full' : `${s.remaining} spots left`}`}
                accessibilityState={{ selected, disabled: full }}
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

        <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Add a personal trainer?</AppText>
        <Card>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <AppText variant="bodyStrong">Guided session</AppText>
              <AppText variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                {feeRange ? `Fee ${inr(feeRange.min)}–${inr(feeRange.max)}. ` : ''}Charged only when a trainer accepts.
              </AppText>
            </View>
            <Switch value={wantTrainer} onValueChange={(v) => { setWantTrainer(v); if (!v) setTrainer(null); }}
              trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#fff" />
          </View>

          {wantTrainer && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {trainers.map((t) => {
                const fee = slot?.duration === 30 ? t.fee30 : t.fee60;
                const selected = trainer?.id === t.id;
                return (
                  <Pressable key={t.id} onPress={() => setTrainer(t)}
                    accessibilityRole="button" accessibilityState={{ selected }}
                    style={[styles.trainerCard, selected && styles.trainerCardActive]}>
                    <Image source={{ uri: t.avatarUrl ?? undefined }} style={styles.trainerAvatar} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <AppText variant="smallStrong">{t.name}</AppText>
                      <AppText variant="small" color={colors.textMuted}>★ {t.rating} · {t.experienceYears}y · {t.specializations.join(', ')}</AppText>
                    </View>
                    <AppText variant="bodyStrong" color={colors.primary}>{inr(fee)}</AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <AppText variant="tiny" color={colors.textSubtle}>TOTAL</AppText>
          <AppText variant="h2">{inr(total)}</AppText>
        </View>
        <Button title={slot ? 'Proceed to pay' : 'Select a slot'} disabled={!slot || (wantTrainer && !trainer)}
          onPress={proceed} style={{ flex: 1, marginLeft: spacing.lg }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  dayRow: { flexDirection: 'row', gap: spacing.sm },
  dayChip: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '31.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 1, ...shadow.sm },
  slotFull: { opacity: 0.4, backgroundColor: colors.surfaceSunken },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  trainerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.md, padding: spacing.sm, paddingRight: spacing.md },
  trainerCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  trainerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceSunken },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
