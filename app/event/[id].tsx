import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchEvent } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Divider, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { inr } from '@/utils/format';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createBooking, creditBalance } = useApp();
  const { data: event, loading, error, reload } = useResource(() => fetchEvent(id), [id]);
  const [reserving, setReserving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) {
    return <View style={styles.container}><Skeleton height={280} radius={0} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}><Skeleton height={24} width="60%" /><Skeleton height={120} /></View></View>;
  }
  if (error || !event) {
    return <View style={[styles.container, { justifyContent: 'center' }]}>
      <EmptyState icon="cloud-offline-outline" title="Event not available" action="Retry" onAction={reload} /></View>;
  }

  const free = event.price === 0;
  const spotsLeft = event.capacity - event.reserved;

  const reserve = async () => {
    setReserving(true);
    setErr(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const creditsUsed = free ? 0 : Math.min(creditBalance, event.price);
      const booking = await createBooking({
        kind: 'event', gymId: event.gymId ?? '', gymName: event.gymName, title: event.title,
        date: event.date, time: event.time, durationMins: event.durationMins,
        amountPaid: free ? 0 : event.price - creditsUsed, creditsUsed, eventId: event.id,
      });
      router.replace(`/ticket/${booking.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reserve.');
      setReserving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <Image source={{ uri: event.imageUrl ?? undefined }} style={{ width, height: 280 }} contentFit="cover" transition={250} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="h1" style={{ flex: 1 }}>{event.title}</AppText>
            {free ? <Badge label="FREE" color="#fff" bg={colors.primary} /> : <Badge label={inr(event.price)} color="#fff" bg={colors.accent} />}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSubtle} />
            <AppText variant="small" color={colors.textMuted}>{event.gymName} · {event.category}</AppText>
          </View>

          <Card style={{ marginTop: spacing.lg }}>
            <Info icon="calendar-outline" label="When" value={`${event.date} · ${event.time}`} />
            <Info icon="time-outline" label="Duration" value={`${event.durationMins} min`} />
            <Info icon="people-outline" label="Spots left" value={`${spotsLeft} of ${event.capacity}`} />
            <Info icon="bag-handle-outline" label="What to bring" value={event.whatToBring} />
          </Card>

          <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>About this event</AppText>
          <AppText variant="body" color={colors.textMuted} style={{ lineHeight: 23 }}>{event.description}</AppText>

          {free && (
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
                Free reservation. Please show up — repeated no-shows can limit future free reservations.
              </AppText>
            </View>
          )}
          {!!err && (
            <View style={[styles.note, { backgroundColor: colors.dangerTint }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>{err}</AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title={spotsLeft <= 0 ? 'Sold out' : free ? 'Reserve free spot' : `Reserve · ${inr(event.price)}`}
          loading={reserving} disabled={spotsLeft <= 0} onPress={reserve} fullWidth icon={spotsLeft > 0 ? 'ticket-outline' : undefined} />
      </View>
    </View>
  );
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={colors.textSubtle} />
        <AppText variant="small" color={colors.textMuted}>{label}</AppText>
      </View>
      <AppText variant="smallStrong" style={{ flexShrink: 1, textAlign: 'right' }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  body: { padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: spacing.md },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
