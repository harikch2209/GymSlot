import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing } from '@/theme';
import { AppText, Button, Card, Divider, Ionicons } from '@/components/ui';
import { inr } from '@/utils/format';

type PayMethod = 'UPI' | 'Card' | 'NetBanking';
const METHODS: { key: PayMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'Card', label: 'Card', icon: 'card-outline' },
  { key: 'NetBanking', label: 'Net banking', icon: 'business-outline' },
];

export default function CheckoutScreen() {
  const p = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { creditBalance, createBooking } = useApp();

  const slotPrice = Number(p.slotPrice) || 0;
  const trainerFee = Number(p.trainerFee) || 0;
  const subtotal = slotPrice + trainerFee;

  const [useCredits, setUseCredits] = useState(false);
  const [method, setMethod] = useState<PayMethod>('UPI');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creditsApplied = useMemo(
    () => (useCredits ? Math.min(creditBalance, subtotal) : 0),
    [useCredits, creditBalance, subtotal],
  );
  const payable = subtotal - creditsApplied;

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      // Payment gateway is simulated; the booking + wallet debit are real and
      // validated server-side via the create_booking RPC.
      await new Promise((r) => setTimeout(r, 700));
      const booking = await createBooking({
        kind: 'slot',
        gymId: p.gymId, gymName: p.gymName, title: p.slotLabel,
        date: p.day, time: p.time, durationMins: Number(p.duration),
        amountPaid: payable, creditsUsed: creditsApplied,
        slotId: p.slotId || null,
        trainerId: p.trainerId || null, trainerName: p.trainerName || null,
      });
      router.replace(`/ticket/${booking.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed. Try again.');
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 150 }}>
        <Card>
          <View style={styles.gymRow}>
            {!!p.gymImage && <Image source={{ uri: p.gymImage }} style={styles.thumb} contentFit="cover" />}
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{p.gymName}</AppText>
              <AppText variant="small" color={colors.textMuted}>{p.day} · {p.slotLabel}</AppText>
            </View>
          </View>
          <Divider />
          <Line label="Slot fee" value={inr(slotPrice)} />
          {trainerFee > 0 && <Line label={`Trainer · ${p.trainerName}`} value={inr(trainerFee)} />}
          <Line label="GST (incl.)" value="Included" muted />
        </Card>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.creditRow}>
            <View style={styles.creditIcon}><Ionicons name="wallet-outline" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Use wallet credits</AppText>
              <AppText variant="small" color={colors.textMuted}>Balance {inr(creditBalance)}</AppText>
            </View>
            <Switch value={useCredits} onValueChange={setUseCredits} disabled={creditBalance <= 0}
              trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#fff" />
          </View>
          {creditsApplied > 0 && (
            <AppText variant="smallStrong" color={colors.primary} style={{ marginTop: spacing.sm }}>
              − {inr(creditsApplied)} credits applied
            </AppText>
          )}
        </Card>

        {payable > 0 && (
          <Card style={{ marginTop: spacing.lg }}>
            <AppText variant="bodyStrong" style={{ marginBottom: spacing.sm }}>Payment method</AppText>
            <View style={{ gap: spacing.sm }}>
              {METHODS.map((m) => {
                const active = method === m.key;
                return (
                  <Pressable key={m.key} onPress={() => setMethod(m.key)}
                    accessibilityRole="radio" accessibilityState={{ selected: active }}
                    style={[styles.method, active && styles.methodActive]}>
                    <Ionicons name={m.icon} size={20} color={active ? colors.primary : colors.textMuted} />
                    <AppText variant="bodyStrong" style={{ flex: 1 }}>
                      {m.label}{m.key === 'UPI' ? '  (recommended)' : ''}
                    </AppText>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>{error}</AppText>
          </View>
        )}

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={13} color={colors.textSubtle} />
          <AppText variant="small" color={colors.textSubtle}>Payments are simulated in this build. No real charge is made.</AppText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <AppText variant="tiny" color={colors.textSubtle}>PAYABLE NOW</AppText>
          <AppText variant="h2">{inr(payable)}</AppText>
        </View>
        <Button title={payable > 0 ? `Pay with ${method === 'NetBanking' ? 'bank' : method}` : 'Confirm booking'}
          loading={paying} onPress={pay} style={{ flex: 1, marginLeft: spacing.lg }} />
      </View>
    </View>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant="body" color={muted ? colors.textMuted : colors.text}>{label}</AppText>
      <AppText variant={muted ? 'body' : 'bodyStrong'} color={muted ? colors.textMuted : colors.text}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  creditIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.md, padding: spacing.md },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.dangerTint, borderRadius: radius.md },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: spacing.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
