import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fetchBooking, checkinBooking, checkoutBooking, requestTrainer } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Divider, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { QRTicket } from '@/components/QRTicket';
import { gstSplit, inr } from '@/utils/format';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const { data: booking, loading, error, reload } = useResource(() => fetchBooking(id), [id]);
  const [checking, setChecking] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onRequestTrainer = () => {
    const go = async (goal?: string) => {
      setRequesting(true); setActionError(null);
      try { await requestTrainer(id, goal); await Promise.all([reload(), refresh()]); }
      catch (e) { setActionError(e instanceof Error ? e.message : 'Could not request a trainer.'); }
      finally { setRequesting(false); }
    };
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt('Request a trainer', 'Your goal for this session (optional):', (g) => go(g));
    } else { go(); }
  };

  const onCheckIn = async () => {
    setChecking(true);
    setActionError(null);
    try {
      await checkinBooking(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not check in.');
    } finally {
      setChecking(false);
    }
  };

  const onCheckOut = async () => {
    setCheckingOut(true);
    setActionError(null);
    try {
      await checkoutBooking(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not check out.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, alignItems: 'center', gap: spacing.lg }}>
      <Skeleton height={56} width={56} radius={28} /><Skeleton height={240} radius={radius.lg} /></View></View>;
  }
  if (error || !booking) {
    return <View style={[styles.container, { justifyContent: 'center' }]}>
      <EmptyState icon="cloud-offline-outline" title="Booking not found" action="Retry" onAction={reload} /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 130 }}>
        <View style={styles.successHeader}>
          <View style={styles.check}><Ionicons name="checkmark" size={30} color="#fff" /></View>
          <AppText variant="h2">Booking confirmed</AppText>
          <View style={styles.notifyRow}>
            <Ionicons name="logo-whatsapp" size={14} color={colors.textMuted} />
            <AppText variant="small" color={colors.textMuted}>Confirmation sent via app + WhatsApp</AppText>
          </View>
        </View>

        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <QRTicket payload={booking.qrPayload} checkedIn={booking.checkedIn} />
          {!!booking.checkinCode && !booking.checkedIn && (
            <View style={styles.codeBox}>
              <AppText variant="small" color={colors.textMuted}>Can&apos;t scan? Give this code</AppText>
              <AppText variant="h2" style={{ letterSpacing: 6, marginTop: 2 }}>{booking.checkinCode}</AppText>
            </View>
          )}
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <AppText variant="h3">{booking.gymName}</AppText>
          <AppText variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>{booking.date} · {booking.title}</AppText>
          <Divider />
          {booking.trainerName ? (
            <View style={styles.row}>
              <AppText variant="small" color={colors.textMuted}>Trainer</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppText variant="smallStrong">{booking.trainerName}</AppText>
                <Badge label={booking.trainerStatus ?? 'Assigned'} color={colors.primary} bg={colors.primaryTint} />
              </View>
            </View>
          ) : booking.trainerStatus === 'Searching' ? (
            <View style={styles.row}>
              <AppText variant="small" color={colors.textMuted}>Trainer</AppText>
              <Badge label="Finding a trainer…" color={colors.warning} bg={colors.warningTint} icon="search" />
            </View>
          ) : booking.trainerStatus === 'Unmatched' ? (
            <View style={styles.row}>
              <AppText variant="small" color={colors.textMuted}>Trainer</AppText>
              <Badge label="None matched" color={colors.textMuted} bg={colors.surfaceAlt} />
            </View>
          ) : null}
          <Line label="Amount paid" value={inr(booking.amountPaid)} />
          {booking.creditsUsed > 0 && <Line label="Credits used" value={inr(booking.creditsUsed)} />}
          {(booking.amountPaid + booking.creditsUsed) > 0 && (
            <Line label="GST (18%, incl.)" value={inr(gstSplit(booking.amountPaid + booking.creditsUsed).tax)} />
          )}
          <Line label="Status" value={booking.status} />
        </Card>

        <View style={styles.policy}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
          <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
            Free cancellation until 2 hours before your slot. Cancel for a refund to source, or instant wallet credits with a 5% bonus.
          </AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {!!actionError && (
          <View style={styles.actionErr}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>{actionError}</AppText>
          </View>
        )}
        {!booking.checkedIn && booking.status === 'Confirmed' && (
          <Button title="Check in — I'm at the gym" variant="secondary" icon="qr-code-outline"
            loading={checking} onPress={onCheckIn} fullWidth style={{ marginBottom: spacing.sm }} />
        )}
        {booking.checkedIn && !booking.checkedOut && (
          <Button title="Check out" variant="secondary" icon="exit-outline"
            loading={checkingOut} onPress={onCheckOut} fullWidth style={{ marginBottom: spacing.sm }} />
        )}
        {booking.kind === 'slot' && booking.status === 'Confirmed' && !booking.trainerId
          && booking.trainerStatus !== 'Searching' && (
          <Button title="Request a trainer" variant="secondary" icon="person-add-outline"
            loading={requesting} onPress={onRequestTrainer} fullWidth style={{ marginBottom: spacing.sm }} />
        )}
        <Button title="Done" onPress={() => router.replace('/(tabs)/bookings')} fullWidth />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" color={colors.textMuted}>{label}</AppText>
      <AppText variant="smallStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  successHeader: { alignItems: 'center', gap: 6 },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  policy: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  codeBox: { alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, alignSelf: 'stretch' },
  actionErr: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
