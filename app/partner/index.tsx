import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COMMISSION_RATE, claimGym, fetchGyms, fetchOwnedGyms, fetchPartnerBookings, partnerCheckin,
} from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Badge, Button, Card, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { inr } from '@/utils/format';
import { Booking } from '@/types';

export default function PartnerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const owned = useResource(fetchOwnedGyms, []);
  const gymIds = useMemo(() => (owned.data ?? []).map((g) => g.id), [owned.data]);
  const bookingsRes = useResource(() => fetchPartnerBookings(gymIds), [gymIds.join(',')]);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (owned.loading) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, gap: spacing.md, paddingTop: insets.top + spacing.xl }}>
      <Skeleton height={28} width="50%" /><Skeleton height={130} radius={radius.lg} /><Skeleton height={80} /></View></View>;
  }

  if (!owned.data?.length) {
    return <ClaimGym insets={insets} onClaimed={() => { owned.reload(); }} onBack={() => router.back()} />;
  }

  const bookings = bookingsRes.data ?? [];
  const completed = bookings.filter((b) => b.status === 'Completed');
  const gross = completed.reduce((s, b) => s + b.amountPaid + b.creditsUsed, 0);
  const commission = Math.round(gross * COMMISSION_RATE);
  const payout = gross - commission;
  const pending = bookings.filter((b) => b.status === 'Confirmed');

  const doCheckin = async (b: Booking) => {
    setBusyId(b.id);
    try { await partnerCheckin(b.id); await bookingsRes.refresh(); }
    finally { setBusyId(null); }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={bookingsRes.refreshing} onRefresh={bookingsRes.refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <AppText variant="h2">Partner</AppText>
              <View style={{ width: 42 }} />
            </View>

            <LinearGradient colors={[colors.ink, '#1C2330']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.earnCard}>
              <AppText variant="smallStrong" color="rgba(255,255,255,0.7)">YOUR PAYOUT (after {Math.round(COMMISSION_RATE * 100)}% fee)</AppText>
              <AppText variant="display" color="#fff" style={{ fontSize: 38, marginTop: 4 }}>{inr(payout)}</AppText>
              <View style={styles.earnRow}>
                <Earn label="Gross" value={inr(gross)} />
                <Earn label="Platform fee" value={`− ${inr(commission)}`} />
                <Earn label="Sessions" value={String(completed.length)} />
              </View>
            </LinearGradient>

            <View style={styles.gymsRow}>
              {owned.data.map((g) => (
                <View key={g.id} style={styles.gymChip}>
                  <Image source={{ uri: g.imageUrl ?? undefined }} style={styles.gymThumb} contentFit="cover" />
                  <AppText variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>{g.name}</AppText>
                </View>
              ))}
            </View>

            <Button title="Scan member QR to check in" icon="qr-code-outline" onPress={() => router.push('/partner/scan')} fullWidth style={{ marginTop: spacing.lg }} />

            <View style={styles.listHeader}>
              <AppText variant="h3">Bookings</AppText>
              {pending.length > 0 && <Badge label={`${pending.length} awaiting check-in`} color={colors.primary} bg={colors.primaryTint} />}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.bookingRow}>
              <View style={[styles.memberIcon, { backgroundColor: item.status === 'Completed' ? colors.primaryTint : colors.surfaceAlt }]}>
                <Ionicons name={item.kind === 'event' ? 'flash' : 'person'} size={18} color={item.status === 'Completed' ? colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{item.memberName ?? 'Member'}</AppText>
                <AppText variant="small" color={colors.textMuted}>{item.date} · {item.time} · {item.title}</AppText>
              </View>
              {item.status === 'Confirmed' ? (
                <Button title="Check in" size="sm" loading={busyId === item.id} onPress={() => doCheckin(item)} />
              ) : (
                <Badge label={item.status} color={item.status === 'Completed' ? colors.primary : colors.danger}
                  bg={item.status === 'Completed' ? colors.primaryTint : colors.dangerTint} />
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          bookingsRes.loading
            ? <Skeleton height={70} radius={radius.lg} />
            : <EmptyState icon="people-outline" title="No bookings yet" body="When members book your gym, they'll appear here to check in." />
        }
      />
    </View>
  );
}

function Earn({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="tiny" color="rgba(255,255,255,0.6)">{label.toUpperCase()}</AppText>
      <AppText variant="bodyStrong" color="#fff">{value}</AppText>
    </View>
  );
}

function ClaimGym({ insets, onClaimed, onBack }: { insets: { top: number }; onClaimed: () => void; onBack: () => void }) {
  const all = useResource(fetchGyms, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const claim = async (id: string) => {
    setBusyId(id);
    try { await claimGym(id); onClaimed(); } finally { setBusyId(null); }
  };
  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }]}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h2">Become a partner</AppText>
        <View style={{ width: 42 }} />
      </View>
      <FlatList
        data={all.data ?? []}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <AppText variant="small" color={colors.textMuted} style={{ marginBottom: spacing.md, lineHeight: 20 }}>
            Pick a gym to manage. You'll see its bookings, check members in, and track your payouts.
            (In production this is an approval + KYC flow; here you can claim one to try it.)
          </AppText>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Image source={{ uri: item.imageUrl ?? undefined }} style={styles.gymThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{item.name}</AppText>
              <AppText variant="small" color={colors.textMuted}>{item.area}</AppText>
            </View>
            <Button title="Manage" size="sm" loading={busyId === item.id} onPress={() => claim(item.id)} />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  earnCard: { borderRadius: radius.lg, padding: spacing.xl, ...shadow.md },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  gymsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  gymChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, paddingRight: spacing.md, ...shadow.sm },
  gymThumb: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
