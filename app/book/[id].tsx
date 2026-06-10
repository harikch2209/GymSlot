import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGym } from '@/data/gyms';
import { TRAINERS, trainerFeeRange } from '@/data/trainers';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import { inr } from '@/utils/format';
import { Slot, Trainer } from '@/types';

const DAYS = ['Today', 'Tomorrow', 'Wed', 'Thu'];

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gym = getGym(id);

  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [wantTrainer, setWantTrainer] = useState(false);
  const [trainer, setTrainer] = useState<Trainer | null>(null);

  const range = useMemo(
    () => trainerFeeRange(slot?.duration ?? 60),
    [slot?.duration],
  );

  if (!gym) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Gym not found.</Text>
      </View>
    );
  }

  const trainerFee =
    wantTrainer && trainer ? (slot?.duration === 30 ? trainer.fee30 : trainer.fee60) : 0;
  const total = (slot?.price ?? 0) + trainerFee;

  const proceed = () => {
    if (!slot) return;
    router.push({
      pathname: '/checkout',
      params: {
        gymId: gym.id,
        gymName: gym.name,
        slotLabel: `${slot.time} · ${slot.duration} min`,
        day: DAYS[day],
        time: slot.time,
        duration: String(slot.duration),
        slotPrice: String(slot.price),
        trainerId: wantTrainer && trainer ? trainer.id : '',
        trainerName: wantTrainer && trainer ? trainer.name : '',
        trainerFee: String(trainerFee),
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 130 }}>
        <Text style={styles.gymName}>{gym.name}</Text>
        <Text style={styles.muted}>{gym.area}</Text>

        <SectionTitle style={{ marginTop: spacing.lg }}>Select day</SectionTitle>
        <View style={styles.dayRow}>
          {DAYS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setDay(i)}
              style={[styles.dayChip, day === i && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, day === i && styles.dayChipTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>Select slot</SectionTitle>
        <View style={styles.slotGrid}>
          {gym.slots.map((s) => {
            const remaining = s.capacity - s.booked;
            const full = remaining <= 0;
            const selected = slot?.id === s.id;
            return (
              <Pressable
                key={s.id}
                disabled={full}
                onPress={() => setSlot(s)}
                style={[
                  styles.slot,
                  full && styles.slotFull,
                  selected && styles.slotSelected,
                ]}
              >
                <Text style={[styles.slotTime, selected && { color: colors.bg }]}>{s.time}</Text>
                <Text style={[styles.slotDur, selected && { color: colors.bg }]}>
                  {s.duration} min
                </Text>
                <Text style={[styles.slotPrice, selected && { color: colors.bg }]}>
                  {inr(s.price)}
                </Text>
                <Text style={[styles.slotCap, selected && { color: colors.bg }, full && { color: colors.danger }]}>
                  {full ? 'Full' : `${remaining} left`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle style={{ marginTop: spacing.xl }}>Add a personal trainer?</SectionTitle>
        <Card>
          <View style={styles.trainerToggle}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.trainerToggleTitle}>Guided session</Text>
              <Text style={styles.muted}>
                Fee range {inr(range.min)}–{inr(range.max)}. Charged only when a trainer accepts.
              </Text>
            </View>
            <Switch
              value={wantTrainer}
              onValueChange={(v) => {
                setWantTrainer(v);
                if (!v) setTrainer(null);
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.text}
            />
          </View>

          {wantTrainer && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {TRAINERS.map((t) => {
                const fee = slot?.duration === 30 ? t.fee30 : t.fee60;
                const selected = trainer?.id === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTrainer(t)}
                    style={[styles.trainerCard, selected && styles.trainerCardActive]}
                  >
                    <Text style={styles.trainerAvatar}>{t.avatar}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trainerName}>{t.name}</Text>
                      <Text style={styles.muted}>
                        ★ {t.rating} · {t.experienceYears}y · {t.specializations.join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.trainerFee}>{inr(fee)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.muted}>Total</Text>
          <Text style={styles.total}>{inr(total)}</Text>
        </View>
        <Button
          title={slot ? 'Proceed to pay' : 'Select a slot'}
          disabled={!slot || (wantTrainer && !trainer)}
          onPress={proceed}
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: font.small },
  gymName: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  dayRow: { flexDirection: 'row', gap: spacing.sm },
  dayChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.textMuted, fontWeight: '700', fontSize: font.small },
  dayChipTextActive: { color: colors.bg },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  slotFull: { opacity: 0.4 },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotTime: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  slotDur: { color: colors.textMuted, fontSize: font.tiny },
  slotPrice: { color: colors.primary, fontSize: font.small, fontWeight: '800', marginTop: 2 },
  slotCap: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  trainerToggle: { flexDirection: 'row', alignItems: 'center' },
  trainerToggleTitle: { color: colors.text, fontSize: font.body, fontWeight: '800', marginBottom: 2 },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  trainerCardActive: { borderColor: colors.primary },
  trainerAvatar: { fontSize: 32 },
  trainerName: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  trainerFee: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
});
