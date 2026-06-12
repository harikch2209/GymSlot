import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  acceptTrainerRequest, becomeTrainer, fetchMyTrainer, fetchTrainerInbox,
  setTrainerAvailability, trainerCancelAssignment, updateTrainerProfile,
} from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useAuth } from '@/context/AuthContext';
import { AppText, Badge, Button, Card, Chip, Field, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Trainer, TrainerRequest } from '@/types';
import { ago, inr } from '@/utils/format';

const SPECS = ['Strength', 'HIIT', 'Yoga', 'CrossFit', 'Mobility', 'Boxing', 'Rehab'];
const LANGS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu'];

export default function TrainerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useResource(fetchMyTrainer, []);

  if (me.loading) {
    return <View style={styles.container}><View style={{ padding: spacing.lg, paddingTop: insets.top + spacing.xl, gap: spacing.md }}>
      <Skeleton height={28} width="50%" /><Skeleton height={120} radius={radius.lg} /></View></View>;
  }
  return me.data
    ? <Dashboard trainer={me.data} onChanged={me.reload} onBack={() => router.back()} insets={insets} />
    : <Signup onDone={me.reload} onBack={() => router.back()} insets={insets} />;
}

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.topRow}>
      <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <AppText variant="h2">{title}</AppText>
      <View style={{ width: 42, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

function TrainerForm({ initial, submitLabel, onSubmit }: {
  initial?: Trainer; submitLabel: string; onSubmit: (v: { specializations: string[]; experienceYears: number; fee30: number; fee60: number; languages: string[]; bio: string; serviceRadiusKm: number; name: string }) => Promise<void>;
}) {
  const { user } = useAuth();
  const [name] = useState(initial?.name ?? (user?.user_metadata?.full_name as string) ?? 'Trainer');
  const [specs, setSpecs] = useState<string[]>(initial?.specializations ?? ['Strength']);
  const [exp, setExp] = useState(String(initial?.experienceYears ?? 3));
  const [fee30, setFee30] = useState(String(initial?.fee30 ?? 400));
  const [fee60, setFee60] = useState(String(initial?.fee60 ?? 700));
  const [langs, setLangs] = useState<string[]>(initial?.languages ?? ['English']);
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [radius_, setRadius] = useState(String(initial?.serviceRadiusKm ?? 12));
  const [busy, setBusy] = useState(false);

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    setBusy(true);
    try {
      await onSubmit({
        name, specializations: specs, experienceYears: Math.max(0, Number(exp) || 0),
        fee30: Math.max(0, Number(fee30) || 0), fee60: Math.max(0, Number(fee60) || 0),
        languages: langs, bio: bio.trim(), serviceRadiusKm: Math.max(1, Number(radius_) || 12),
      });
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View>
        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>Specializations</AppText>
        <View style={styles.chips}>{SPECS.map((s) => <Chip key={s} label={s} active={specs.includes(s)} onPress={() => toggle(specs, setSpecs, s)} />)}</View>
      </View>
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="Experience (yrs)" value={exp} onChangeText={setExp} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Service radius (km)" value={radius_} onChangeText={setRadius} keyboardType="number-pad" />
      </View>
      <View style={styles.row2}>
        <Field style={{ flex: 1 }} label="Fee · 30 min (₹)" value={fee30} onChangeText={setFee30} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Fee · 60 min (₹)" value={fee60} onChangeText={setFee60} keyboardType="number-pad" />
      </View>
      <View>
        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>Languages</AppText>
        <View style={styles.chips}>{LANGS.map((l) => <Chip key={l} label={l} active={langs.includes(l)} onPress={() => toggle(langs, setLangs, l)} />)}</View>
      </View>
      <Field label="Bio" value={bio} onChangeText={setBio} placeholder="A line about your coaching style" multiline />
      <Button title={submitLabel} loading={busy} onPress={save} fullWidth />
    </View>
  );
}

function Signup({ onDone, onBack, insets }: { onDone: () => void; onBack: () => void; insets: { top: number; bottom: number } }) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <Header title="Become a trainer" onBack={onBack} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppText variant="small" color={colors.textMuted} style={{ marginBottom: spacing.lg }}>
          Set up your trainer profile to receive session requests from members near you. (Verification is automatic in this demo.)
        </AppText>
        <TrainerForm submitLabel="Create trainer profile" onSubmit={async (v) => {
          await becomeTrainer({ name: v.name, specializations: v.specializations, experienceYears: v.experienceYears, fee30: v.fee30, fee60: v.fee60, languages: v.languages, bio: v.bio, serviceRadiusKm: v.serviceRadiusKm });
          onDone();
        }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Dashboard({ trainer, onChanged, onBack, insets }: { trainer: Trainer; onChanged: () => void; onBack: () => void; insets: { top: number; bottom: number } }) {
  const inbox = useResource(fetchTrainerInbox, []);
  const [available, setAvailable] = useState(trainer.available);
  const [editing, setEditing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleAvail = async (v: boolean) => {
    setAvailable(v);
    try { await setTrainerAvailability(v); onChanged(); }
    catch (e) { setAvailable(!v); Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.'); }
  };
  const accept = async (r: TrainerRequest) => {
    setBusyId(r.id);
    try { await acceptTrainerRequest(r.id); inbox.reload(); }
    catch (e) { Alert.alert('Could not accept', e instanceof Error ? e.message : 'Try again.'); inbox.reload(); }
    finally { setBusyId(null); }
  };
  const drop = async (r: TrainerRequest) => {
    Alert.alert('Cancel this session?', 'The member will be matched with another trainer. Repeated cancellations affect your ranking.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel session', style: 'destructive', onPress: async () => {
        setBusyId(r.id);
        try { await trainerCancelAssignment(r.id); inbox.reload(); onChanged(); }
        catch (e) { Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again.'); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  const list = inbox.data ?? [];
  const open = list.filter((r) => r.status === 'searching' && r.trainerId == null);
  const mine = list.filter((r) => r.trainerId === trainer.id && r.status === 'assigned');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={inbox.refreshing} onRefresh={inbox.refresh} tintColor={colors.primary} />}>
        <Header title="Trainer" onBack={onBack} />

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="h3">{trainer.name}</AppText>
                {trainer.verified && <Badge label="Verified" color={colors.primary} bg={colors.primaryTint} icon="checkmark-circle" />}
              </View>
              <AppText variant="small" color={colors.textMuted}>
                {trainer.specializations.join(', ') || '—'} · {trainer.experienceYears}y · {inr(trainer.fee30)}/{inr(trainer.fee60)}
              </AppText>
              <AppText variant="tiny" color={colors.textSubtle} style={{ marginTop: 2 }}>
                {trainer.completedSessions} sessions · {trainer.serviceRadiusKm} km radius
              </AppText>
            </View>
            <Pressable onPress={() => setEditing((e) => !e)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit profile">
              <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.availRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{available ? 'Available for requests' : 'Not accepting requests'}</AppText>
              <AppText variant="tiny" color={colors.textSubtle}>Toggle off when you’re fully booked</AppText>
            </View>
            <Switch value={available} onValueChange={toggleAvail} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor="#fff" />
          </View>
        </Card>

        {editing && (
          <Card style={{ marginTop: spacing.lg }}>
            <TrainerForm initial={trainer} submitLabel="Save profile" onSubmit={async (v) => {
              await updateTrainerProfile({ specializations: v.specializations, experienceYears: v.experienceYears, fee30: v.fee30, fee60: v.fee60, languages: v.languages, bio: v.bio, serviceRadiusKm: v.serviceRadiusKm });
              setEditing(false); onChanged();
            }} />
          </Card>
        )}

        <View style={styles.sectionRow}>
          <AppText variant="h3">Requests near you</AppText>
          {open.length > 0 && <Badge label={`${open.length} new`} color={colors.warning} bg={colors.warningTint} />}
        </View>
        {open.length === 0
          ? <AppText variant="small" color={colors.textSubtle}>No open requests right now. New ones appear here when members nearby need a trainer.</AppText>
          : open.map((r) => <RequestCard key={r.id} r={r} busy={busyId === r.id} action={<Button title={`Accept · ${inr(r.fee)}`} size="sm" loading={busyId === r.id} onPress={() => accept(r)} />} />)}

        <View style={styles.sectionRow}>
          <AppText variant="h3">Your sessions</AppText>
        </View>
        {mine.length === 0
          ? <AppText variant="small" color={colors.textSubtle}>Sessions you accept show up here.</AppText>
          : mine.map((r) => <RequestCard key={r.id} r={r} assigned busy={busyId === r.id}
              action={<Button title="Cancel" variant="ghost" size="sm" loading={busyId === r.id} onPress={() => drop(r)} />} />)}
      </ScrollView>
    </View>
  );
}

function RequestCard({ r, action, assigned, busy }: { r: TrainerRequest; action: React.ReactNode; assigned?: boolean; busy?: boolean }) {
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000));
  return (
    <Card style={{ marginBottom: spacing.sm, gap: spacing.sm, opacity: busy ? 0.7 : 1 }}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{r.gymName ?? 'Gym session'}</AppText>
          <AppText variant="tiny" color={colors.textSubtle}>{r.durationMins} min · {inr(r.fee)} · {ago(minsAgo)}</AppText>
        </View>
        {assigned && <Badge label="Assigned" color={colors.primary} bg={colors.primaryTint} />}
      </View>
      {!!r.goalNote && (
        <View style={styles.goalRow}>
          <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
          <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>{r.goalNote}</AppText>
        </View>
      )}
      <View style={{ alignItems: 'flex-end' }}>{action}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
