import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEvent } from '@/data/events';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Card, Pill } from '@/components/ui';
import { inr } from '@/utils/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createBooking, creditBalance } = useApp();
  const [reserving, setReserving] = useState(false);

  const event = getEvent(id);
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Event not found.</Text>
      </View>
    );
  }

  const free = event.price === 0;
  const spotsLeft = event.capacity - event.reserved;

  const reserve = () => {
    setReserving(true);
    setTimeout(() => {
      // Paid events pay from credits first (PRD: credits usable on paid events).
      const creditsUsed = free ? 0 : Math.min(creditBalance, event.price);
      const booking = createBooking({
        kind: 'event',
        gymId: event.gymId,
        gymName: event.gymName,
        title: event.title,
        date: event.date,
        time: event.time,
        durationMins: event.durationMins,
        amountPaid: free ? 0 : event.price - creditsUsed,
        creditsUsed,
      });
      setReserving(false);
      router.replace(`/ticket/${booking.id}`);
    }, 700);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>{event.image}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            {free ? (
              <Pill label="FREE" color={colors.bg} bg={colors.primary} />
            ) : (
              <Pill label={inr(event.price)} color={colors.bg} bg={colors.accent} />
            )}
          </View>
          <Text style={styles.meta}>
            {event.gymName} · {event.category}
          </Text>

          <Card style={{ marginTop: spacing.lg }}>
            <Info label="When" value={`${event.date} · ${event.time}`} />
            <Info label="Duration" value={`${event.durationMins} min`} />
            <Info label="Spots left" value={`${spotsLeft} of ${event.capacity}`} />
            <Info label="What to bring" value={event.whatToBring} />
          </Card>

          <Text style={styles.descTitle}>About this event</Text>
          <Text style={styles.desc}>{event.description}</Text>

          {free && (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Free reservation. Please show up — repeated no-shows can limit future free
                reservations.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={free ? 'Reserve free spot' : `Reserve · ${inr(event.price)}`}
          loading={reserving}
          disabled={spotsLeft <= 0}
          onPress={reserve}
        />
      </View>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
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
    height: 170,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 64 },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '900', flex: 1 },
  meta: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel: { color: colors.textMuted, fontSize: font.small },
  infoValue: { color: colors.text, fontSize: font.small, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  descTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  desc: { color: colors.textMuted, fontSize: font.body, lineHeight: 22 },
  noteBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  noteText: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
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
