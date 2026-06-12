import React, { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Divider, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { TrainerRatingSheet } from '@/components/TrainerRatingSheet';
import { inr } from '@/utils/format';
import { Booking } from '@/types';

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, cancelBooking, loading, refreshing, refresh } = useApp();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rateTrainer, setRateTrainer] = useState<{ id: string; name: string } | null>(null);

  const filtered = bookings.filter((b) => (tab === 'upcoming' ? b.status === 'Confirmed' : b.status !== 'Confirmed'));

  const onCancel = (b: Booking) => {
    const late = b.startsAt != null && new Date(b.startsAt).getTime() - Date.now() < 2 * 3_600_000;
    if (late) {
      Alert.alert('Cancel within 2 hours?',
        'You’re within 2 hours of your slot, so no refund applies (no-show policy). Cancel anyway?', [
          { text: 'Keep booking', style: 'cancel' },
          { text: 'Cancel (no refund)', style: 'destructive', onPress: () => runCancel(b.id, false) },
        ]);
      return;
    }
    Alert.alert('Cancel booking?', 'Choose how you want your refund. Instant credits include a 5% bonus.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Refund to source', onPress: () => runCancel(b.id, false) },
      { text: 'Instant credits +5%', onPress: () => runCancel(b.id, true) },
    ]);
  };
  const runCancel = async (id: string, asCredits: boolean) => {
    setBusyId(id);
    try { await cancelBooking(id, asCredits); }
    catch (e) { Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusyId(null); }
  };

  const statusColor = (s: Booking['status']) =>
    s === 'Confirmed' ? colors.primary : s === 'Completed' ? colors.accent : colors.danger;
  const statusBg = (s: Booking['status']) =>
    s === 'Confirmed' ? colors.primaryTint : s === 'Completed' ? colors.accentTint : colors.dangerTint;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={styles.tabBtn}>
            <AppText variant="bodyStrong" color={tab === t ? colors.text : colors.textSubtle}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</AppText>
            {tab === t && <View style={styles.underline} />}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.headerRow}>
              <View style={[styles.kindIcon, { backgroundColor: statusBg(item.status) }]}>
                <Ionicons name={item.kind === 'event' ? 'flash' : 'barbell'} size={18} color={statusColor(item.status)} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3" numberOfLines={1}>{item.gymName}</AppText>
                <AppText variant="small" color={colors.textMuted}>{item.date} · {item.title}</AppText>
              </View>
              <Badge label={item.status} color={statusColor(item.status)} bg={statusBg(item.status)} />
            </View>

            {item.trainerName && (
              <View style={styles.trainerRow}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <AppText variant="small" color={colors.textMuted}>Trainer: {item.trainerName}</AppText>
              </View>
            )}

            <Divider />
            <View style={styles.footerRow}>
              <View>
                <AppText variant="tiny" color={colors.textSubtle}>TOTAL</AppText>
                <AppText variant="h3">{inr(item.amountPaid + item.creditsUsed)}</AppText>
              </View>
              <View style={styles.actions}>
                <Button title="View QR" variant="secondary" size="sm" icon="qr-code-outline" onPress={() => router.push(`/ticket/${item.id}`)} />
                {item.status === 'Confirmed' && item.kind === 'slot' && (
                  <Button title="Reschedule" variant="secondary" size="sm" icon="swap-horizontal"
                    onPress={() => router.push({ pathname: '/reschedule/[id]', params: { id: item.id } })} />
                )}
                {item.status === 'Confirmed' && (
                  <Button title="Cancel" variant="ghost" size="sm" loading={busyId === item.id} onPress={() => onCancel(item)} />
                )}
                {item.status === 'Completed' && item.trainerId && item.trainerName && (
                  <Button title="Rate trainer" variant="ghost" size="sm" icon="star-outline"
                    onPress={() => setRateTrainer({ id: item.trainerId!, name: item.trainerName! })} />
                )}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1].map((i) => <View key={i} style={[styles.skeleton]}><Skeleton height={80} /></View>)}
            </View>
          ) : (
            <EmptyState icon="calendar-outline" title={`No ${tab} bookings`}
              body={tab === 'upcoming' ? 'Find a gym and book your first slot.' : 'Your completed and cancelled bookings show up here.'}
              action={tab === 'upcoming' ? 'Discover gyms' : undefined}
              onAction={() => router.push('/(tabs)')} />
          )
        }
      />
      {rateTrainer && (
        <TrainerRatingSheet
          trainerId={rateTrainer.id} trainerName={rateTrainer.name}
          visible onClose={() => setRateTrainer(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  tabs: { flexDirection: 'row', gap: spacing.xl, paddingHorizontal: spacing.lg, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  underline: { height: 3, width: '100%', backgroundColor: colors.ink, borderRadius: 2, marginTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kindIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trainerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  skeleton: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm },
});
