import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchReviews, submitReview } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, shadow, spacing, type as Ty } from '@/theme';
import { AppText, Button, Card, Ionicons } from './ui';

function StarRow({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? colors.star : colors.textSubtle} />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(n); }}
            accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
            {star}
          </Pressable>
        ) : <View key={n}>{star}</View>;
      })}
    </View>
  );
}

export function ReviewsSection({ gymId }: { gymId: string }) {
  const { user } = useAuth();
  const { data: reviews, reload } = useResource(() => fetchReviews(gymId), [gymId]);
  const list = reviews ?? [];
  const mine = useMemo(() => list.find((r) => r.userId && r.userId === user?.id), [list, user?.id]);
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openComposer = () => {
    setRating(mine?.rating ?? 5);
    setComment(mine?.comment ?? '');
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await submitReview(gymId, rating, comment);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setOpen(false);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="h2">Ratings & reviews</AppText>
        <Button title={mine ? 'Edit yours' : 'Write a review'} variant="ghost" size="sm" icon="create-outline" onPress={openComposer} />
      </View>

      <Card style={styles.aggregate}>
        <View style={{ alignItems: 'center', paddingRight: spacing.lg }}>
          <AppText variant="display" style={{ fontSize: 34 }}>{(avg || 0).toFixed(1)}</AppText>
          <StarRow value={avg} />
          <AppText variant="tiny" color={colors.textSubtle} style={{ marginTop: 4 }}>{list.length} REVIEW{list.length === 1 ? '' : 'S'}</AppText>
        </View>
        <View style={styles.aggDivider} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <AppText variant="small" color={colors.textMuted}>
            {list.length ? 'What members say about this gym after their sessions.' : 'No reviews yet — be the first after you train here.'}
          </AppText>
        </View>
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        {list.slice(0, 6).map((r) => (
          <View key={r.id} style={styles.review}>
            <View style={styles.avatar}>
              <AppText variant="smallStrong" color={colors.onPrimary}>
                {r.reviewerName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.reviewTop}>
                <AppText variant="smallStrong">{r.reviewerName}{r.userId === user?.id ? ' (you)' : ''}</AppText>
                <StarRow value={r.rating} size={12} />
              </View>
              {!!r.comment && <AppText variant="small" color={colors.textMuted} style={{ marginTop: 3, lineHeight: 19 }}>{r.comment}</AppText>}
            </View>
          </View>
        ))}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText variant="h3">{mine ? 'Edit your review' : 'Rate this gym'}</AppText>
          <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
            <StarRow value={rating} size={34} onChange={setRating} />
          </View>
          <TextInput
            value={comment} onChangeText={setComment} multiline
            placeholder="Share a few words (optional)" placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <AppText variant="small" color={colors.danger} style={{ flex: 1 }}>{error}</AppText>
            </View>
          )}
          <Button title="Submit review" loading={busy} onPress={submit} fullWidth style={{ marginTop: spacing.md }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  aggregate: { flexDirection: 'row', alignItems: 'center' },
  aggDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginRight: spacing.lg },
  review: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl, ...shadow.lg,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  input: {
    ...Ty.body, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.md, minHeight: 90, textAlignVertical: 'top',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
});
