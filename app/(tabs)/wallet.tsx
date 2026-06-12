import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing } from '@/theme';
import { AppText, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { expiryLabel, inr } from '@/utils/format';
import { CreditEntry, CreditReason } from '@/types';

const REASON: Record<CreditReason, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  refund: { icon: 'arrow-undo-outline', tint: colors.accent },
  'cancellation-bonus': { icon: 'gift-outline', tint: colors.primary },
  promo: { icon: 'sparkles-outline', tint: colors.warning },
  goodwill: { icon: 'heart-outline', tint: colors.crowdHigh },
  spend: { icon: 'cart-outline', tint: colors.textMuted },
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { creditBalance, ledger, loading, refreshing, refresh } = useApp();

  const now = Date.now();
  const soonRaw = ledger
    .filter((e) => e.amount > 0 && e.expiresAt != null
      && new Date(e.expiresAt).getTime() > now
      && new Date(e.expiresAt).getTime() - now <= 7 * 86_400_000)
    .reduce((s, e) => s + e.amount, 0);
  // Never claim more is expiring than is actually available (credits may already be spent).
  const expiringSoon = Math.min(creditBalance, soonRaw);

  return (
    <View style={styles.container}>
      <FlatList
        data={ledger}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <LinearGradient colors={[colors.ink, '#1C2330']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
              <View style={styles.balanceTop}>
                <AppText variant="smallStrong" color="rgba(255,255,255,0.7)">AVAILABLE CREDITS</AppText>
                <Ionicons name="wallet" size={20} color={colors.primary} />
              </View>
              <AppText variant="display" color="#fff" style={{ fontSize: 42, marginTop: 6 }}>{inr(creditBalance)}</AppText>
              <AppText variant="small" color="rgba(255,255,255,0.65)" style={{ marginTop: 6 }}>
                Usable on any gym slot, trainer session, or paid event.
              </AppText>
            </LinearGradient>
            {expiringSoon > 0 && (
              <View style={styles.expiryBanner}>
                <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
                <AppText variant="small" color={colors.text} style={{ flex: 1 }}>
                  {inr(expiringSoon)} in credits expire within 7 days — use them soon.
                </AppText>
              </View>
            )}
            <AppText variant="h3" style={{ marginBottom: spacing.sm }}>Transaction history</AppText>
          </View>
        }
        renderItem={({ item }: { item: CreditEntry }) => {
          const credit = item.amount >= 0;
          const meta = REASON[item.reason];
          const exp = item.amount > 0 ? expiryLabel(item.expiresAt) : null;
          const expired = exp === 'expired';
          return (
            <View style={[styles.entry, expired && { opacity: 0.55 }]}>
              <View style={[styles.entryIcon, { backgroundColor: `${meta.tint}1A` }]}>
                <Ionicons name={meta.icon} size={18} color={meta.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="smallStrong" numberOfLines={1}>{item.label}</AppText>
                <AppText variant="tiny" color={colors.textSubtle}>
                  {new Date(item.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {exp ? ` · ${exp}` : ''}
                </AppText>
              </View>
              <AppText variant="bodyStrong" color={expired ? colors.textSubtle : credit ? colors.primary : colors.text}
                style={expired ? { textDecorationLine: 'line-through' } : undefined}>
                {credit ? '+' : '−'} {inr(Math.abs(item.amount))}
              </AppText>
            </View>
          );
        }}
        ListEmptyComponent={
          loading
            ? <View style={{ gap: spacing.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={56} radius={radius.md} />)}</View>
            : <EmptyState icon="receipt-outline" title="No transactions yet" body="Your credit history will appear here as you book and earn." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  balanceCard: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl, ...shadow.md },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  entryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  expiryBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningTint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
});
