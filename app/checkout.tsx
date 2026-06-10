import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Card } from '@/components/ui';
import { inr } from '@/utils/format';

type PayMethod = 'UPI' | 'Card' | 'NetBanking';

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    gymId: string;
    gymName: string;
    slotLabel: string;
    day: string;
    time: string;
    duration: string;
    slotPrice: string;
    trainerId: string;
    trainerName: string;
    trainerFee: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creditBalance, createBooking } = useApp();

  const slotPrice = Number(params.slotPrice) || 0;
  const trainerFee = Number(params.trainerFee) || 0;
  const subtotal = slotPrice + trainerFee;

  const [useCredits, setUseCredits] = useState(false);
  const [method, setMethod] = useState<PayMethod>('UPI');
  const [paying, setPaying] = useState(false);

  const creditsApplied = useMemo(
    () => (useCredits ? Math.min(creditBalance, subtotal) : 0),
    [useCredits, creditBalance, subtotal],
  );
  const payable = subtotal - creditsApplied;

  const pay = () => {
    setPaying(true);
    // Simulate payment gateway round-trip.
    setTimeout(() => {
      const booking = createBooking({
        kind: 'slot',
        gymId: params.gymId,
        gymName: params.gymName,
        title: params.slotLabel,
        date: params.day,
        time: params.time,
        durationMins: Number(params.duration),
        amountPaid: payable,
        creditsUsed: creditsApplied,
        trainerId: params.trainerId || undefined,
        trainerName: params.trainerName || undefined,
      });
      setPaying(false);
      router.replace(`/ticket/${booking.id}`);
    }, 900);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 130 }}>
        <Card>
          <Text style={styles.gymName}>{params.gymName}</Text>
          <Text style={styles.muted}>
            {params.day} · {params.slotLabel}
          </Text>
          <View style={styles.divider} />
          <Line label="Slot fee" value={inr(slotPrice)} />
          {trainerFee > 0 && (
            <Line label={`Trainer · ${params.trainerName}`} value={inr(trainerFee)} />
          )}
          <Line label="GST (incl.)" value="Included" muted />
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.creditRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Use wallet credits</Text>
              <Text style={styles.muted}>Balance {inr(creditBalance)}</Text>
            </View>
            <Switch
              value={useCredits}
              onValueChange={setUseCredits}
              disabled={creditBalance <= 0}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.text}
            />
          </View>
          {creditsApplied > 0 && (
            <Text style={styles.creditApplied}>− {inr(creditsApplied)} credits applied</Text>
          )}
        </Card>

        {payable > 0 && (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={styles.cardTitle}>Payment method</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {(['UPI', 'Card', 'NetBanking'] as PayMethod[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[styles.method, method === m && styles.methodActive]}
                >
                  <Text style={styles.methodEmoji}>
                    {m === 'UPI' ? '📲' : m === 'Card' ? '💳' : '🏦'}
                  </Text>
                  <Text style={styles.methodLabel}>
                    {m === 'NetBanking' ? 'Net banking' : m}
                    {m === 'UPI' ? '  (recommended)' : ''}
                  </Text>
                  <View style={[styles.radio, method === m && styles.radioActive]} />
                </Pressable>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.muted}>Payable now</Text>
          <Text style={styles.total}>{inr(payable)}</Text>
        </View>
        <Button
          title={payable > 0 ? `Pay with ${method}` : 'Confirm booking'}
          loading={paying}
          onPress={pay}
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </View>
  );
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, muted && { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.lineValue, muted && { color: colors.textMuted, fontWeight: '400' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: font.small },
  gymName: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineLabel: { color: colors.text, fontSize: font.body },
  lineValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  creditRow: { flexDirection: 'row', alignItems: 'center' },
  creditApplied: { color: colors.primary, fontSize: font.small, fontWeight: '700', marginTop: spacing.sm },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  methodActive: { borderColor: colors.primary },
  methodEmoji: { fontSize: 20 },
  methodLabel: { color: colors.text, fontSize: font.body, fontWeight: '700', flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
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
