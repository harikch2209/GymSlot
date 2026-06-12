import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNotificationPrefs, setNotificationPref } from '@/lib/api';
import { AppText, Card, Ionicons, Skeleton } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { NotificationPrefKey, NotificationPrefs } from '@/types';

type Field = keyof NotificationPrefs;
type Item = { field: Field; key: NotificationPrefKey; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap };

const TOPICS: Item[] = [
  { field: 'booking', key: 'booking', label: 'Bookings', sub: 'Confirmations & cancellations', icon: 'checkmark-circle-outline' },
  { field: 'reminders', key: 'reminders', label: 'Session reminders', sub: 'About an hour before your slot', icon: 'alarm-outline' },
  { field: 'refunds', key: 'refunds', label: 'Refund status', sub: 'Credits & source refunds', icon: 'wallet-outline' },
  { field: 'trainer', key: 'trainer', label: 'Trainer updates', sub: 'Matched, unmatched & changes', icon: 'person-outline' },
  { field: 'events', key: 'events', label: 'Events near you', sub: 'New sessions at nearby gyms', icon: 'flash-outline' },
  { field: 'partner', key: 'partner', label: 'Partner alerts', sub: 'New bookings at gyms you own', icon: 'business-outline' },
];

const CHANNELS: Item[] = [
  { field: 'pushEnabled', key: 'push_enabled', label: 'Push notifications', sub: 'On this device', icon: 'phone-portrait-outline' },
  { field: 'smsEnabled', key: 'sms_enabled', label: 'SMS / WhatsApp', sub: 'Texts for important updates', icon: 'chatbubble-ellipses-outline' },
];

export default function NotificationPrefsScreen() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotificationPrefs().then(setPrefs).catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  const toggle = async (item: Item, value: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [item.field]: value });           // optimistic
    try {
      const next = await setNotificationPref(item.key, value);
      setPrefs(next);
    } catch {
      setPrefs((p) => (p ? { ...p, [item.field]: !value } : p)); // revert on failure
    }
  };

  const Row = ({ item, last }: { item: Item; last: boolean }) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}><Ionicons name={item.icon} size={18} color={colors.text} /></View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{item.label}</AppText>
        <AppText variant="small" color={colors.textMuted} style={{ marginTop: 1 }}>{item.sub}</AppText>
      </View>
      <Switch
        value={!!prefs?.[item.field]}
        onValueChange={(v) => toggle(item, v)}
        disabled={!prefs}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.surface}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      {error && <AppText variant="small" color={colors.danger} style={{ marginBottom: spacing.md }}>{error}</AppText>}

      <AppText variant="label" color={colors.textSubtle} style={styles.sectionLabel}>WHAT TO NOTIFY ME ABOUT</AppText>
      <Card padded={false}>
        {prefs
          ? TOPICS.map((t, i) => <Row key={t.key} item={t} last={i === TOPICS.length - 1} />)
          : <View style={{ padding: spacing.lg, gap: spacing.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={28} />)}</View>}
      </Card>

      <AppText variant="label" color={colors.textSubtle} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>HOW TO REACH ME</AppText>
      <Card padded={false}>
        {prefs
          ? CHANNELS.map((c, i) => <Row key={c.key} item={c} last={i === CHANNELS.length - 1} />)
          : <View style={{ padding: spacing.lg, gap: spacing.md }}>{[0, 1].map((i) => <Skeleton key={i} height={28} />)}</View>}
      </Card>

      <AppText variant="small" color={colors.textSubtle} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
        In-app notifications always stay on. Push needs a device build; SMS/WhatsApp needs a verified number.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
