import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Card, Pill } from '@/components/ui';
import { QRTicket } from '@/components/QRTicket';
import { inr } from '@/utils/format';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, checkIn } = useApp();
  const booking = bookings.find((b) => b.id === id);

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Booking not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 110 }}>
        <View style={styles.successHeader}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.successTitle}>Booking confirmed</Text>
          <Text style={styles.muted}>Confirmation sent via app + WhatsApp</Text>
        </View>

        <Card style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <QRTicket payload={booking.qrPayload} checkedIn={booking.checkedIn} />
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.gymName}>{booking.gymName}</Text>
          <Text style={styles.slot}>
            {booking.date} · {booking.title}
          </Text>
          <View style={styles.divider} />
          {booking.trainerName && (
            <View style={styles.trainerRow}>
              <Text style={styles.infoLabel}>Trainer</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.infoValue}>{booking.trainerName}</Text>
                <Pill label={booking.trainerStatus ?? 'Assigned'} color={colors.primary} />
              </View>
            </View>
          )}
          <Line label="Amount paid" value={inr(booking.amountPaid)} />
          {booking.creditsUsed > 0 && (
            <Line label="Credits used" value={inr(booking.creditsUsed)} />
          )}
          <Line label="Status" value={booking.status} />
        </Card>

        <View style={styles.policy}>
          <Text style={styles.policyText}>
            Free cancellation until 2 hours before your slot. Cancel to get a refund to source or
            instant wallet credits with a 5% bonus.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {!booking.checkedIn && booking.status === 'Confirmed' ? (
          <Button title="Simulate gym check-in" variant="secondary" onPress={() => checkIn(booking.id)} />
        ) : null}
        <Button
          title="Done"
          onPress={() => router.replace('/(tabs)/bookings')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: font.small },
  successHeader: { alignItems: 'center', gap: 4 },
  check: {
    fontSize: 30,
    color: colors.bg,
    fontWeight: '900',
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    textAlign: 'center',
    lineHeight: 56,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  successTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  gymName: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  slot: { color: colors.textMuted, fontSize: font.body, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  trainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel: { color: colors.textMuted, fontSize: font.small },
  infoValue: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  policy: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  policyText: { color: colors.textMuted, fontSize: font.small, lineHeight: 20 },
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
