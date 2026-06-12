import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitReport } from '@/lib/api';
import { AppText, Button, Chip, Ionicons } from '@/components/ui';
import { colors, radius, spacing, type as Ty } from '@/theme';
import { ReportSubjectType } from '@/types';

const REASONS: Record<ReportSubjectType, string[]> = {
  gym: ['Misleading information', 'Cleanliness / safety', 'Inaccurate crowd level', 'Overcharged', 'Other'],
  trainer: ['No-show', 'Unprofessional behaviour', 'Safety concern', 'Other'],
  booking: ['Couldn’t check in', 'Wrong charge', 'Slot unavailable', 'Other'],
  event: ['Misleading event', 'Cancelled without notice', 'Other'],
  user: ['Abuse or harassment', 'Spam', 'Other'],
};

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, id, label } = useLocalSearchParams<{ type?: string; id?: string; label?: string }>();
  const subjectType = (['gym', 'trainer', 'booking', 'event', 'user'].includes(type ?? '') ? type : 'gym') as ReportSubjectType;
  const reasons = REASONS[subjectType];

  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await submitReport({ subjectType, subjectId: id ?? null, subjectLabel: label ?? null, reason, details: details.trim() || undefined });
      Alert.alert('Report submitted', 'Thanks — our team will review this and follow up if needed.');
      router.back();
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Ionicons name="flag-outline" size={18} color={colors.danger} />
          <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
            Reporting {label ? `“${label}”` : `this ${subjectType}`}. Reports are confidential and reviewed by our team.
          </AppText>
        </View>

        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>What’s wrong?</AppText>
        <View style={styles.chips}>
          {reasons.map((r) => <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />)}
        </View>

        <AppText variant="smallStrong" color={colors.textMuted} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Details (optional)</AppText>
        <TextInput
          value={details} onChangeText={setDetails} multiline
          placeholder="Tell us what happened…" placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />

        <Button title="Submit report" icon="send" loading={busy} onPress={submit} fullWidth style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  banner: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.dangerTint, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { ...Ty.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
});
