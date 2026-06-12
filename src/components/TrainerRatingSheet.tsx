import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { submitTrainerReview } from '@/lib/api';
import { colors, radius, shadow, spacing, type as Ty } from '@/theme';
import { AppText, Button, Chip, Ionicons } from './ui';

const TRAINER_TAGS = ['Punctual', 'Knowledgeable', 'Motivating', 'Professional', 'Late', 'Unprepared'];

export function TrainerRatingSheet({
  trainerId, trainerName, visible, onClose, onDone,
}: { trainerId: string; trainerName: string; visible: boolean; onClose: () => void; onDone?: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await submitTrainerReview(trainerId, rating, comment, tags);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit.');
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <AppText variant="h3">Rate {trainerName}</AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: spacing.lg }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => { Haptics.selectionAsync().catch(() => {}); setRating(n); }}
              accessibilityRole="button" accessibilityLabel={`${n} stars`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? colors.star : colors.textSubtle} />
            </Pressable>
          ))}
        </View>
        <View style={styles.tags}>
          {TRAINER_TAGS.map((t) => <Chip key={t} label={t} active={tags.includes(t)} onPress={() => toggle(t)} />)}
        </View>
        <TextInput value={comment} onChangeText={setComment} multiline
          placeholder="Share a few words (optional)" placeholderTextColor={colors.textSubtle} style={styles.input} />
        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>{error}</AppText>
          </View>
        )}
        <Button title="Submit rating" loading={busy} onPress={submit} fullWidth style={{ marginTop: spacing.md }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl, ...shadow.lg },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.md },
  input: { ...Ty.body, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, minHeight: 80, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
});
