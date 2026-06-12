import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  claimGym, fetchGyms, fetchOwnedGyms, fetchPartnerBookings, fetchPendingGyms, fetchSettlement,
  isAdmin, partnerCheckin, partnerSetCrowd, verifyGym,
} from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Badge, Button, Card, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { inr } from '@/utils/format';
import { Booking, CrowdLevel, Gym, GymStatus } from '@/types';

const STATUS_BADGE: Record<GymStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: colors.textMuted, bg: colors.surfaceAlt },
  pending: { label: 'Pending', color: colors.warning, bg: colors.warningTint },
  verified: { label: 'Live', color: colors.primary, bg: colors.primaryTint },
  rejected: { label: 'Needs changes', color: colors.danger, bg: colors.dangerTint },
};

export default function PartnerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const owned = useResource(fetchOwnedGyms, []);
  const gymIds = useMemo(() => (owned.data ?? []).map((g) => g.id), [owned.data]);
  const bookingsRes = useResource(() => fetchPartnerBookings(gymIds), [gymIds.join(',')]);
  const settlement = useResource(fetchSettlement, []);
  const admin = useResource(isAdmin, []);
  const pending = useResource(fetchPendingGyms, []);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (owned.loading && !owned.data) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, gap: spacing.md, paddingTop: insets.top + spacing.xl }}>
      <Skeleton height={28} width="50%" /><Skeleton height={130} radius={radius.lg} /><Skeleton height={80} /></View></View>;
  }

  if (!owned.data?.length) {
    return <Onboard insets={insets} onClaimed={() => owned.reload()} onBack={() => router.back()} onRegister={() => router.push('/partner/register')} />;
  }

  const bookings = bookingsRes.data ?? [];
  const completed = bookings.filter((b) => b.status === 'Completed');
  const pendingCheckins = bookings.filter((b) => b.status === 'Confirmed');
  const s = settlement.data;
  const isReviewer = admin.data === true;
  const queue = isReviewer ? (pending.data ?? []) : [];

  const doCheckin = async (b: Booking) => {
    setBusyId(b.id);
    try { await partnerCheckin(b.id); await bookingsRes.refresh(); }
    catch (e) { Alert.alert('Could not check in', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusyId(null); }
  };

  const refreshAll = () => { bookingsRes.refresh(); settlement.refresh(); owned.refresh(); pending.refresh(); };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={bookingsRes.refreshing} onRefresh={refreshAll} tintColor={colors.primary} />}
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
              <AppText variant="smallStrong" color="rgba(255,255,255,0.7)">SETTLED PAYOUT (Razorpay)</AppText>
              <AppText variant="display" color="#fff" style={{ fontSize: 38, marginTop: 4 }}>{inr(s?.payout ?? 0)}</AppText>
              <View style={styles.earnRow}>
                <Earn label="Collected" value={inr(s?.gross ?? 0)} />
                <Earn label="Platform fee" value={`− ${inr(s?.commission ?? 0)}`} />
                <Earn label="Paid sessions" value={String(s?.sessions ?? 0)} />
              </View>
            </LinearGradient>

            {isReviewer && queue.length > 0 && (
              <>
                <View style={styles.listHeader}>
                  <AppText variant="h3">Awaiting verification</AppText>
                  <Badge label={`${queue.length} to review`} color={colors.warning} bg={colors.warningTint} />
                </View>
                {queue.map((g) => <ReviewRow key={g.id} gym={g} onDone={() => { pending.reload(); owned.reload(); }} />)}
              </>
            )}

            <View style={styles.listHeader}>
              <AppText variant="h3">Your gyms</AppText>
              <Pressable onPress={() => router.push('/partner/register')} hitSlop={8} accessibilityRole="button">
                <AppText variant="smallStrong" color={colors.primary}>+ Register gym</AppText>
              </Pressable>
            </View>
            <View style={{ gap: spacing.sm }}>
              {owned.data.map((g) => (
                <GymRow key={g.id} gym={g} onManage={() => router.push({ pathname: '/partner/gym/[id]', params: { id: g.id } })} onCrowd={owned.reload} />
              ))}
            </View>

            <Button title="Scan member QR to check in" icon="qr-code-outline" onPress={() => router.push('/partner/scan')} fullWidth style={{ marginTop: spacing.lg }} />

            <View style={styles.listHeader}>
              <AppText variant="h3">Bookings</AppText>
              {pendingCheckins.length > 0 && <Badge label={`${pendingCheckins.length} awaiting check-in`} color={colors.primary} bg={colors.primaryTint} />}
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

const CROWD_LEVELS: CrowdLevel[] = ['Low', 'Moderate', 'High', 'Full'];

function GymRow({ gym, onManage, onCrowd }: { gym: Gym; onManage: () => void; onCrowd: () => void }) {
  const [busy, setBusy] = useState(false);
  const badge = STATUS_BADGE[gym.status];
  const set = async (level: CrowdLevel) => {
    setBusy(true);
    try { await partnerSetCrowd(gym.id, level); onCrowd(); } finally { setBusy(false); }
  };
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.gymHeadRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{gym.name}</AppText>
          <AppText variant="tiny" color={colors.textSubtle}>{gym.area}</AppText>
        </View>
        <Badge label={badge.label} color={badge.color} bg={badge.bg} />
        <Pressable onPress={onManage} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Manage ${gym.name}`} style={styles.manageBtn}>
          <Ionicons name="settings-outline" size={18} color={colors.text} />
        </Pressable>
      </View>
      {gym.status === 'verified' && (
        <View style={styles.crowdBtns}>
          {CROWD_LEVELS.map((l) => {
            const active = gym.crowd === l;
            return (
              <Pressable key={l} onPress={() => set(l)} disabled={busy}
                accessibilityRole="button" accessibilityState={{ selected: active }}
                style={[styles.crowdBtn, active && styles.crowdBtnActive]}>
                <AppText variant="tiny" color={active ? colors.onPrimary : colors.textMuted}>{l}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function ReviewRow({ gym, onDone }: { gym: Gym; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const decide = async (approve: boolean, reason?: string) => {
    setBusy(true);
    try { await verifyGym(gym.id, approve, reason); onDone(); }
    catch (e) { Alert.alert(approve ? 'Could not approve' : 'Could not reject', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const approve = () => decide(true);
  const reject = () => {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt('Reject gym', 'Reason for the owner (optional):', (reason) => decide(false, reason));
    } else {
      Alert.alert('Reject gym?', `${gym.name} will be sent back for changes.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => decide(false) },
      ]);
    }
  };
  return (
    <Card style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
      <View style={styles.gymHeadRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{gym.name}</AppText>
          <AppText variant="tiny" color={colors.textSubtle}>{gym.area}, {gym.city} · from {inr(gym.priceFrom)}</AppText>
        </View>
      </View>
      <View style={styles.row2}>
        <Button title="Reject" variant="ghost" size="sm" onPress={reject} style={{ flex: 1 }} />
        <Button title="Approve & publish" size="sm" loading={busy} onPress={approve} style={{ flex: 2 }} />
      </View>
    </Card>
  );
}

function Onboard({ insets, onClaimed, onBack, onRegister }: { insets: { top: number }; onClaimed: () => void; onBack: () => void; onRegister: () => void }) {
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
          <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
            <Card style={styles.registerCard}>
              <View style={styles.registerIcon}><Ionicons name="business" size={22} color={colors.onPrimary} /></View>
              <View style={{ flex: 1 }}>
                <AppText variant="h3">List your gym</AppText>
                <AppText variant="small" color={colors.textMuted}>Register in minutes. Goes live after verification.</AppText>
              </View>
              <Button title="Start" size="sm" onPress={onRegister} />
            </Card>
            <AppText variant="smallStrong" color={colors.textMuted}>Or claim a demo gym to explore the tools</AppText>
          </View>
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
  gymThumb: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gymHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  manageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  crowdBtns: { flexDirection: 'row', gap: 4 },
  crowdBtn: { flex: 1, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  crowdBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  row2: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  registerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  registerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
