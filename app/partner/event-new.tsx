import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createEvent, fetchEvent, updateEvent } from '@/lib/api';
import { AppText, Button, Chip, Field, Ionicons } from '@/components/ui';
import { colors, shadow, spacing } from '@/theme';

const CATEGORIES = ['Workshop', 'Bootcamp', 'Open house', 'Masterclass', 'Community run'];
const DURATIONS = [30, 45, 60, 90];

export default function EventForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId, eventId } = useLocalSearchParams<{ gymId?: string; eventId?: string }>();
  const editing = !!eventId;

  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [gid, setGid] = useState(gymId ?? '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Workshop');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState('20');
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [whatToBring, setWhatToBring] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!editing || !eventId) return;
    fetchEvent(eventId).then((e) => {
      if (e) {
        setGid(e.gymId ?? '');
        setTitle(e.title); setCategory(e.category); setDate(e.date); setTime(e.time);
        setDuration(e.durationMins); setCapacity(String(e.capacity));
        setFree(e.price === 0); setPrice(e.price ? String(e.price) : '');
        setImageUrl(e.imageUrl ?? ''); setWhatToBring(e.whatToBring); setDescription(e.description);
      }
    }).finally(() => setLoading(false));
  }, [editing, eventId]);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Add a title', 'Give your event a name.'); return; }
    if (!gid) { Alert.alert('Missing gym', 'No gym selected for this event.'); return; }
    setBusy(true);
    try {
      const input = {
        gymId: gid, title: title.trim(), category, description: description.trim(),
        date: date.trim(), time: time.trim(), durationMins: duration, capacity: Math.max(1, Number(capacity) || 20),
        price: free ? 0 : Math.max(0, Number(price) || 0), imageUrl: imageUrl.trim() || null, whatToBring: whatToBring.trim() || null,
      };
      if (editing && eventId) await updateEvent({ ...input, eventId });
      else await createEvent(input);
      router.back();
    } catch (e) {
      Alert.alert('Could not save event', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><AppText color={colors.textMuted}>Loading…</AppText></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h3">{editing ? 'Edit event' : 'New event'}</AppText>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Saturday HIIT Bootcamp" icon="flash-outline" />
        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Category</AppText>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
        </View>

        <View style={styles.row2}>
          <Field style={{ flex: 1 }} label="Date" value={date} onChangeText={setDate} placeholder="Sat, 14 Jun" />
          <Field style={{ flex: 1 }} label="Time" value={time} onChangeText={setTime} placeholder="7:00 AM" />
        </View>

        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Duration</AppText>
        <View style={styles.chips}>
          {DURATIONS.map((d) => <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />)}
        </View>

        <View style={[styles.row2, { marginTop: spacing.lg }]}>
          <Field style={{ flex: 1 }} label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
          <View style={{ flex: 1 }}>
            <AppText variant="smallStrong" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>Pricing</AppText>
            <View style={styles.chips}>
              <Chip label="Free" active={free} onPress={() => setFree(true)} />
              <Chip label="Paid" active={!free} onPress={() => setFree(false)} />
            </View>
          </View>
        </View>
        {!free && <Field label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="number-pad" style={{ marginTop: spacing.md }} />}

        <Field label="Cover image URL (optional)" value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" style={{ marginTop: spacing.lg }} />
        <Field label="What to bring (optional)" value={whatToBring} onChangeText={setWhatToBring} placeholder="Towel, water" style={{ marginTop: spacing.md }} />
        <Field label="Description" value={description} onChangeText={setDescription} placeholder="What’s the session about?" multiline style={{ marginTop: spacing.md }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title={editing ? 'Save changes' : 'Publish event'} icon={editing ? 'checkmark' : 'megaphone-outline'} loading={busy} onPress={submit} fullWidth />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
