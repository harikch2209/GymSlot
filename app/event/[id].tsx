import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPaymentOrder, fetchEvent, verifyPayment } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { RazorpayCheckout, type RazorpayOptions, type RazorpaySuccess } from '@/components/RazorpayCheckout';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Divider, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { gstSplit, inr } from '@/utils/format';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createBooking, creditBalance, refresh } = useApp();
  const { user } = useAuth();
  const { data: event, loading, error, reload } = useResource(() => fetchEvent(id), [id]);
  const [reserving, setReserving] = useState(false);
  const [useCredits, setUseCredits] = useState(true);
  const [rzp, setRzp] = useState<RazorpayOptions | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const free = !!event && event.price === 0;
  const creditsApplied = useMemo(
    () => (event && !free && useCredits ? Math.min(creditBalance, event.price) : 0),
    [event, free, useCredits, creditBalance],
  );
  const payable = event ? (free ? 0 : event.price - creditsApplied) : 0;

  if (loading) {
    return <View style={styles.container}><Skeleton height={280} radius={0} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}><Skeleton height={24} width="60%" /><Skeleton height={120} /></View></View>;
  }
  if (error || !event || event.status !== 'published') {
    const cancelled = !!event && event.status === 'cancelled';
    return <View style={[styles.container, { justifyContent: 'center' }]}>
      <EmptyState icon={cancelled ? 'close-circle-outline' : 'cloud-offline-outline'}
        title={cancelled ? 'Event cancelled' : 'Event not available'}
        body={cancelled ? 'This event was cancelled by the gym.' : undefined}
        action={cancelled ? undefined : 'Retry'} onAction={cancelled ? undefined : reload} /></View>;
  }

  const spotsLeft = event.capacity - event.reserved;

  const reserve = async () => {
    setReserving(true);
    setErr(null);
    try {
      if (payable <= 0) {
        // Free, or fully covered by wallet credits — no gateway needed.
        const booking = await createBooking({
          kind: 'event', gymId: event.gymId ?? '', gymName: event.gymName, title: event.title,
          date: event.date, time: event.time, durationMins: event.durationMins,
          amountPaid: 0, creditsUsed: creditsApplied, eventId: event.id,
        });
        router.replace(`/ticket/${booking.id}`);
        return;
      }
      // Paid event: server computes the payable from the catalog and opens Razorpay.
      const order = await createPaymentOrder({
        kind: 'event', gymId: event.gymId ?? '', gymName: event.gymName, eventId: event.id,
        durationMins: event.durationMins, title: event.title, day: event.date, time: event.time,
        creditsToUse: creditsApplied,
      });
      setRzp({
        orderId: order.orderId, amount: order.amount, keyId: order.keyId,
        description: `${event.gymName} · ${event.title}`,
        email: user?.email, name: (user?.user_metadata?.full_name as string) ?? undefined,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reserve.');
      setReserving(false);
    }
  };

  const onPaid = async (r: RazorpaySuccess) => {
    setRzp(null);
    try {
      const { bookingId } = await verifyPayment(r.orderId, r.paymentId, r.signature);
      await refresh();
      router.replace(`/ticket/${bookingId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Payment verification failed.');
      setReserving(false);
    }
  };

  const ctaTitle = spotsLeft <= 0 ? 'Sold out'
    : free ? 'Reserve free spot'
      : payable <= 0 ? 'Reserve with credits'
        : `Reserve · ${inr(payable)}`;

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
            {!free && <Info icon="receipt-outline" label="GST (18%, incl.)" value={inr(gstSplit(event.price).tax)} />}
          </Card>

          {!free && creditBalance > 0 && (
            <Card style={{ marginTop: spacing.lg }}>
              <View style={styles.creditRow}>
                <View style={styles.creditIcon}><Ionicons name="wallet-outline" size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Use wallet credits</AppText>
                  <AppText variant="small" color={colors.textMuted}>Balance {inr(creditBalance)}</AppText>
                </View>
                <Switch value={useCredits} onValueChange={setUseCredits}
                  trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#fff" />
              </View>
              {creditsApplied > 0 && (
                <>
                  <Divider />
                  <View style={styles.payRow}>
                    <AppText variant="small" color={colors.textMuted}>Credits applied</AppText>
                    <AppText variant="smallStrong" color={colors.primary}>− {inr(creditsApplied)}</AppText>
                  </View>
                  <View style={styles.payRow}>
                    <AppText variant="small" color={colors.textMuted}>Payable now</AppText>
                    <AppText variant="smallStrong">{inr(payable)}</AppText>
                  </View>
                </>
              )}
            </Card>
          )}

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
        <Button title={ctaTitle}
          loading={reserving} disabled={spotsLeft <= 0} onPress={reserve} fullWidth icon={spotsLeft > 0 ? 'ticket-outline' : undefined} />
      </View>

      <RazorpayCheckout
        visible={!!rzp}
        options={rzp}
        onSuccess={onPaid}
        onDismiss={() => { setRzp(null); setReserving(false); }}
        onError={(msg) => { setRzp(null); setErr(msg); setReserving(false); }}
      />
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
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  creditIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  note: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
