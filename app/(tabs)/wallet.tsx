import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { inr } from '@/utils/format';
import { CreditEntry } from '@/types';

const REASON_EMOJI: Record<string, string> = {
  refund: '↩️',
  'cancellation-bonus': '🎁',
  promo: '✨',
  goodwill: '💚',
  spend: '🛒',
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { creditBalance, ledger } = useApp();

  return (
    <View style={styles.container}>
      <FlatList
        data={ledger}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available credits</Text>
              <Text style={styles.balanceValue}>{inr(creditBalance)}</Text>
              <Text style={styles.balanceHint}>
                Usable on any gym slot, trainer session, or paid event.
              </Text>
            </View>
            <Text style={styles.ledgerTitle}>Transaction history</Text>
          </View>
        }
        renderItem={({ item }: { item: CreditEntry }) => {
          const credit = item.amount >= 0;
          return (
            <View style={styles.entry}>
              <Text style={styles.entryEmoji}>{REASON_EMOJI[item.reason] ?? '•'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryLabel}>{item.label}</Text>
                <Text style={styles.entryDate}>
                  {new Date(item.at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              <Text style={[styles.entryAmount, { color: credit ? colors.primary : colors.danger }]}>
                {credit ? '+' : '−'} {inr(Math.abs(item.amount))}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  balanceLabel: { color: colors.bg, fontSize: font.small, fontWeight: '700', opacity: 0.8 },
  balanceValue: { color: colors.bg, fontSize: 40, fontWeight: '900', marginTop: 4 },
  balanceHint: { color: colors.bg, fontSize: font.small, opacity: 0.8, marginTop: spacing.sm },
  ledgerTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginBottom: spacing.md },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryEmoji: { fontSize: 22 },
  entryLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  entryDate: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  entryAmount: { fontSize: font.body, fontWeight: '900' },
});
