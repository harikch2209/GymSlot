import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addBlackout, cancelEvent, createSlot, deleteSlot, eventAnalytics, fetchBlackouts, fetchGym,
  fetchGymKyc, fetchManageEvents, fetchSlots, removeBlackout, submitGymForReview, updateGym,
  updateSlot, upsertGymKyc,
} from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Badge, Button, Card, Chip, Field, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Amenity, Blackout, EventStatus, Gym, GymEvent, GymKyc, GymStatus, Slot } from '@/types';
import { inr } from '@/utils/format';

const AMENITIES: Amenity[] = ['Cardio', 'Weights', 'Shower', 'Parking', 'AC', 'Locker', 'CrossFit'];

const STATUS_META: Record<GymStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { label: 'Draft', color: colors.textMuted, bg: colors.surfaceAlt, icon: 'create-outline' },
  pending: { label: 'Pending verification', color: colors.warning, bg: colors.warningTint, icon: 'hourglass-outline' },
  verified: { label: 'Live', color: colors.primary, bg: colors.primaryTint, icon: 'checkmark-circle' },
  rejected: { label: 'Needs changes', color: colors.danger, bg: colors.dangerTint, icon: 'alert-circle-outline' },
};

export default function ManageGym() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gym, setGym] = useState<Gym | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [kyc, setKyc] = useState<GymKyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Bumped on every load so the prop-seeded editors below remount with fresh data.
  const [version, setVersion] = useState(0);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!id) return;
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    try {
      const [g, s, b, k] = await Promise.all([fetchGym(id), fetchSlots(id), fetchBlackouts(id), fetchGymKyc(id)]);
      setGym(g); setSlots(s); setBlackouts(b); setKyc(k); setVersion((v) => v + 1);
    } finally {
      setRefreshing(false); setLoading(false);
    }
  }, [id]);

  useEffect(() => { load('initial'); }, [load]);

  const onSubmit = async () => {
    if (!gym) return;
    setBusy(true);
    try { const g = await submitGymForReview(gym.id); setGym(g); }
    catch (e) { Alert.alert('Could not submit', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };

  if (loading || !gym) {
    return (
      <View style={styles.container}>
        <View style={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, gap: spacing.md }}>
          <Skeleton height={28} width="60%" /><Skeleton height={120} radius={radius.lg} /><Skeleton height={90} radius={radius.lg} />
        </View>
      </View>
    );
  }

  const meta = STATUS_META[gym.status];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{gym.name}</AppText>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled">

        {/* Status */}
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.statusRow}>
            <Badge label={meta.label} color={meta.color} bg={meta.bg} icon={meta.icon} />
            {gym.status === 'verified' && <AppText variant="tiny" color={colors.textSubtle}>Discoverable to members</AppText>}
          </View>
          {gym.status === 'rejected' && !!gym.rejectionReason && (
            <AppText variant="small" color={colors.danger}>{gym.rejectionReason}</AppText>
          )}
          {(gym.status === 'draft' || gym.status === 'rejected') && (
            <Button title="Submit for verification" icon="cloud-upload-outline" loading={busy} onPress={onSubmit} fullWidth />
          )}
          {gym.status === 'pending' && (
            <AppText variant="small" color={colors.textMuted}>We’re reviewing your gym — you’ll be notified when it’s live.</AppText>
          )}
        </Card>

        <SectionTitle title="Details" />
        <BasicsEditor key={`basics-${version}`} gym={gym} onSaved={setGym} />

        <SectionTitle title="Slots" hint="What members can book" />
        {slots.map((s) => (
          <SlotEditor key={`${s.id}-${version}`} slot={s} onChanged={() => load('refresh')} />
        ))}
        <AddSlot gymId={gym.id} onAdded={() => load('refresh')} />

        <SectionTitle title="Blackout dates" hint="Block maintenance / holidays" />
        <BlackoutEditor gymId={gym.id} slots={slots} blackouts={blackouts} onChanged={() => load('refresh')} />

        <SectionTitle title="Events" hint="Workshops, bootcamps & open houses" />
        <EventsManager gymId={gym.id} verified={gym.status === 'verified'} />

        <SectionTitle title="Payout & KYC" />
        <KycEditor key={`kyc-${version}`} gymId={gym.id} kyc={kyc} onSaved={setKyc} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="h3">{title}</AppText>
      {hint && <AppText variant="tiny" color={colors.textSubtle}>{hint}</AppText>}
    </View>
  );
}

function BasicsEditor({ gym, onSaved }: { gym: Gym; onSaved: (g: Gym) => void }) {
  const [name, setName] = useState(gym.name);
  const [area, setArea] = useState(gym.area);
  const [city, setCity] = useState(gym.city);
  const [about, setAbout] = useState(gym.about);
  const [timings, setTimings] = useState(gym.timings);
  const [capacity, setCapacity] = useState(String(gym.effectiveCapacity));
  const [amenities, setAmenities] = useState<Amenity[]>(gym.amenities);
  const [saving, setSaving] = useState(false);

  const toggle = (a: Amenity) => setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const save = async () => {
    setSaving(true);
    try {
      const g = await updateGym({
        gymId: gym.id, name, area, city, lat: gym.lat, lng: gym.lng,
        priceFrom: gym.priceFrom, amenities, about: about || null, timings: timings || null,
        imageUrl: gym.imageUrl, images: gym.images, effectiveCapacity: Math.max(1, Number(capacity) || gym.effectiveCapacity),
      });
      onSaved(g);
      Alert.alert('Saved', 'Your gym details were updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally { setSaving(false); }
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Field label="Name" value={name} onChangeText={setName} />
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="Area" value={area} onChangeText={setArea} />
        <Field style={{ flex: 1 }} label="City" value={city} onChangeText={setCity} />
      </View>
      <Field label="About" value={about} onChangeText={setAbout} multiline />
      <View style={styles.row2}>
        <Field style={{ flex: 2 }} label="Hours" value={timings} onChangeText={setTimings} />
        <Field style={{ flex: 1 }} label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      </View>
      <View style={styles.chips}>
        {AMENITIES.map((a) => <Chip key={a} label={a} active={amenities.includes(a)} onPress={() => toggle(a)} />)}
      </View>
      <Button title="Save details" variant="secondary" loading={saving} onPress={save} />
    </Card>
  );
}

function SlotEditor({ slot, onChanged }: { slot: Slot; onChanged: () => void }) {
  const [time, setTime] = useState(slot.time);
  const [price, setPrice] = useState(String(slot.price));
  const [capacity, setCapacity] = useState(String(slot.capacity));
  const [duration, setDuration] = useState<30 | 60>(slot.duration);
  const [peak, setPeak] = useState(slot.peak);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateSlot(slot.id, time, duration, Math.max(0, Number(price) || 0), Math.max(1, Number(capacity) || 1), peak);
      onChanged();
    } catch (e) { Alert.alert('Could not save slot', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const remove = () => {
    Alert.alert('Delete slot?', `${slot.time} · ${slot.duration} min`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteSlot(slot.id); onChanged(); }
        catch (e) { Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.'); }
      } },
    ]);
  };

  return (
    <Card style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="Time" value={time} onChangeText={setTime} />
        <Field style={{ flex: 1 }} label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Cap" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      </View>
      <View style={styles.row2}>
        {([30, 60] as const).map((d) => <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />)}
        <Chip label="Peak" active={peak} onPress={() => setPeak(!peak)} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={remove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete slot">
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
        <Button title="Save" size="sm" variant="secondary" loading={busy} onPress={save} />
      </View>
    </Card>
  );
}

function AddSlot({ gymId, onAdded }: { gymId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('12');
  const [duration, setDuration] = useState<30 | 60>(60);
  const [peak, setPeak] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!time.trim()) { Alert.alert('Add a time', 'e.g. 6:00 AM'); return; }
    setBusy(true);
    try {
      await createSlot(gymId, time.trim(), duration, Math.max(0, Number(price) || 0), Math.max(1, Number(capacity) || 12), peak);
      setOpen(false); setTime(''); setPrice(''); setCapacity('12'); setDuration(60); setPeak(false);
      onAdded();
    } catch (e) { Alert.alert('Could not add slot', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };

  if (!open) return <Button title="Add slot" variant="secondary" icon="add" onPress={() => setOpen(true)} />;
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="Time" value={time} onChangeText={setTime} placeholder="6:00 AM" />
        <Field style={{ flex: 1 }} label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Cap" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      </View>
      <View style={styles.row2}>
        {([30, 60] as const).map((d) => <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />)}
        <Chip label="Peak" active={peak} onPress={() => setPeak(!peak)} />
      </View>
      <View style={styles.row2}>
        <Button title="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} style={{ flex: 1 }} />
        <Button title="Add slot" size="sm" loading={busy} onPress={add} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

function BlackoutEditor({ gymId, slots, blackouts, onChanged }: { gymId: string; slots: Slot[]; blackouts: Blackout[]; onChanged: () => void }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [slotId, setSlotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!date.trim()) { Alert.alert('Add a date', 'Use YYYY-MM-DD'); return; }
    setBusy(true);
    try { await addBlackout(gymId, date.trim(), slotId, reason.trim() || undefined); setDate(''); setReason(''); setSlotId(null); onChanged(); }
    catch (e) { Alert.alert('Could not add', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    try { await removeBlackout(id); onChanged(); }
    catch (e) { Alert.alert('Could not remove', e instanceof Error ? e.message : 'Try again.'); }
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      {blackouts.length === 0
        ? <AppText variant="small" color={colors.textSubtle}>No blocked dates.</AppText>
        : blackouts.map((b) => (
          <View key={b.id} style={styles.blackoutRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <AppText variant="smallStrong">{b.date}{b.slotId ? ` · ${slots.find((s) => s.id === b.slotId)?.time ?? 'slot'}` : ' · whole day'}</AppText>
              {!!b.reason && <AppText variant="tiny" color={colors.textSubtle}>{b.reason}</AppText>}
            </View>
            <Pressable onPress={() => remove(b.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove blackout">
              <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
            </Pressable>
          </View>
        ))}
      <View style={styles.row2}>
        <Field style={{ flex: 2 }} label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-08-15" autoCapitalize="none" />
        <Field style={{ flex: 2 }} label="Reason" value={reason} onChangeText={setReason} placeholder="Holiday" />
      </View>
      <View style={styles.chips}>
        <Chip label="Whole day" active={slotId === null} onPress={() => setSlotId(null)} />
        {slots.map((s) => <Chip key={s.id} label={s.time} active={slotId === s.id} onPress={() => setSlotId(s.id)} />)}
      </View>
      <Button title="Block date" variant="secondary" icon="add" loading={busy} onPress={add} />
    </Card>
  );
}

function KycEditor({ gymId, kyc, onSaved }: { gymId: string; kyc: GymKyc | null; onSaved: (k: GymKyc) => void }) {
  const [legalName, setLegalName] = useState(kyc?.legalName ?? '');
  const [pan, setPan] = useState(kyc?.pan ?? '');
  const [gstin, setGstin] = useState(kyc?.gstin ?? '');
  const [bankName, setBankName] = useState(kyc?.bankAccountName ?? '');
  const [bankAccount, setBankAccount] = useState(kyc?.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(kyc?.bankIfsc ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const k = await upsertGymKyc({ gymId, legalName, pan, gstin, bankAccountName: bankName, bankAccountNumber: bankAccount, bankIfsc });
      onSaved(k);
      Alert.alert('Saved', 'Payout details updated.');
    } catch (e) { Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <Field label="Legal / business name" value={legalName} onChangeText={setLegalName} />
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters" />
        <Field style={{ flex: 1 }} label="GSTIN" value={gstin} onChangeText={setGstin} autoCapitalize="characters" />
      </View>
      <Field label="Bank account name" value={bankName} onChangeText={setBankName} />
      <View style={styles.row2}>
        <Field style={{ flex: 2 }} label="Account number" value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="IFSC" value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />
      </View>
      <Button title="Save payout details" variant="secondary" loading={saving} onPress={save} />
    </Card>
  );
}

const EVENT_BADGE: Record<EventStatus, { color: string; bg: string }> = {
  draft: { color: colors.textMuted, bg: colors.surfaceAlt },
  published: { color: colors.primary, bg: colors.primaryTint },
  cancelled: { color: colors.danger, bg: colors.dangerTint },
};

function EventsManager({ gymId, verified }: { gymId: string; verified: boolean }) {
  const router = useRouter();
  const events = useResource(() => fetchManageEvents(gymId), [gymId]);
  useFocusEffect(useCallback(() => { events.reload(); }, [gymId]));
  const [busyId, setBusyId] = useState<string | null>(null);

  const cancel = (e: GymEvent) => {
    Alert.alert('Cancel event?', `“${e.title}” — all attendees are refunded to their wallet and notified.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel event', style: 'destructive', onPress: async () => {
        setBusyId(e.id);
        try { await cancelEvent(e.id); events.reload(); }
        catch (err) { Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Try again.'); }
        finally { setBusyId(null); }
      } },
    ]);
  };
  const showAnalytics = async (e: GymEvent) => {
    try {
      const a = await eventAnalytics(e.id);
      Alert.alert(`${e.title} — analytics`,
        `Reservations: ${a.reservations}\nAttended: ${a.attended}\nNew to your gym: ${a.newToGym}\nRevenue: ${inr(a.revenue)}`);
    } catch (err) { Alert.alert('Could not load', err instanceof Error ? err.message : 'Try again.'); }
  };

  if (!verified) {
    return <Card><AppText variant="small" color={colors.textMuted}>You can publish events once your gym is verified.</AppText></Card>;
  }
  const list = events.data ?? [];
  return (
    <View style={{ gap: spacing.sm }}>
      {list.map((e) => {
        const badge = EVENT_BADGE[e.status];
        return (
          <Card key={e.id} style={{ gap: spacing.sm }}>
            <View style={styles.eventHeadRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>{e.title}</AppText>
                <AppText variant="tiny" color={colors.textSubtle}>
                  {e.date || '—'}{e.time ? ` · ${e.time}` : ''} · {e.price === 0 ? 'Free' : inr(e.price)} · cap {e.capacity}
                </AppText>
              </View>
              <Badge label={e.status} color={badge.color} bg={badge.bg} />
            </View>
            {e.status !== 'cancelled' && (
              <View style={styles.row2}>
                <Button title="Stats" variant="ghost" size="sm" onPress={() => showAnalytics(e)} style={{ flex: 1 }} />
                <Button title="Edit" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/partner/event-new', params: { eventId: e.id } })} style={{ flex: 1 }} />
                <Button title="Cancel" variant="ghost" size="sm" loading={busyId === e.id} onPress={() => cancel(e)} style={{ flex: 1 }} />
              </View>
            )}
          </Card>
        );
      })}
      <Button title="Create event" variant="secondary" icon="add" onPress={() => router.push({ pathname: '/partner/event-new', params: { gymId } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md, gap: 2 },
  row2: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  blackoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  eventHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
