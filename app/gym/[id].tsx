import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGym } from '@/data/gyms';
import { colors, font, radius, spacing } from '@/theme';
import { CrowdBadge } from '@/components/CrowdBadge';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import { inr } from '@/utils/format';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gym = getGym(id);

  if (!gym) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Gym not found.</Text>
      </View>
    );
  }

  const availableToday = gym.slots.filter((s) => s.booked < s.capacity).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={[styles.banner, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.bannerEmoji}>{gym.image}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{gym.name}</Text>
            <Text style={styles.rating}>★ {gym.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.meta}>
            {gym.area} · {gym.distanceKm} km · {gym.reviews} reviews
          </Text>

          <View style={styles.crowdRow}>
            <CrowdBadge level={gym.crowd} updatedMinsAgo={gym.crowdUpdatedMinsAgo} showTimestamp />
          </View>

          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.about}>{gym.about}</Text>
            <View style={styles.divider} />
            <InfoLine label="Timings" value={gym.timings} />
            <InfoLine
              label="Slots available today"
              value={`${availableToday} of ${gym.slots.length}`}
            />
            <InfoLine label="Price from" value={`${inr(gym.priceFrom)} / slot`} />
          </Card>

          <SectionTitle style={{ marginTop: spacing.xl }}>Amenities</SectionTitle>
          <View style={styles.amenities}>
            {gym.amenities.map((a) => (
              <Pill key={a} label={a} color={colors.text} />
            ))}
          </View>

          <SectionTitle style={{ marginTop: spacing.xl }}>Pick a slot</SectionTitle>
          <View style={styles.slotGrid}>
            {gym.slots.map((slot) => {
              const remaining = slot.capacity - slot.booked;
              const full = remaining <= 0;
              return (
                <View
                  key={slot.id}
                  style={[styles.slot, full && styles.slotFull]}
                >
                  <Text style={styles.slotTime}>{slot.time}</Text>
                  <Text style={styles.slotDur}>{slot.duration} min</Text>
                  <Text style={styles.slotPrice}>{inr(slot.price)}</Text>
                  {slot.peak && !full && <Pill label="Peak" color={colors.warning} bg="transparent" />}
                  <Text style={[styles.slotCap, full && { color: colors.danger }]}>
                    {full ? 'Full' : `${remaining} left`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="Continue to booking"
          onPress={() => router.push(`/book/${gym.id}`)}
        />
      </View>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.textMuted },
  banner: {
    height: 200,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 72 },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '900', flex: 1, marginRight: 8 },
  rating: { color: colors.warning, fontSize: font.h3, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  crowdRow: { marginTop: spacing.md },
  about: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: colors.textMuted, fontSize: font.small },
  infoValue: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  slotFull: { opacity: 0.45 },
  slotTime: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  slotDur: { color: colors.textMuted, fontSize: font.tiny },
  slotPrice: { color: colors.primary, fontSize: font.small, fontWeight: '800', marginTop: 2 },
  slotCap: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
