import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { Card } from '@/components/ui';
import { inr } from '@/utils/format';

const MENU = [
  { icon: '🏋️', label: 'List your gym (Partner)' },
  { icon: '🧑‍🏫', label: 'Become a trainer' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '🧾', label: 'GST invoices' },
  { icon: '💬', label: 'Help & WhatsApp support' },
  { icon: '📄', label: 'Terms & safety' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, creditBalance } = useApp();

  const completed = bookings.filter((b) => b.status === 'Completed').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>HK</Text>
        </View>
        <View>
          <Text style={styles.name}>Hari Krishna</Text>
          <Text style={styles.muted}>+91 ••••• 43210</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={String(bookings.length)} label="Bookings" />
        <Stat value={String(completed)} label="Sessions" />
        <Stat value={inr(creditBalance)} label="Credits" />
      </View>

      <Card style={{ padding: 0, marginTop: spacing.xl, overflow: 'hidden' }}>
        {MENU.map((m, i) => (
          <View key={m.label} style={[styles.menuItem, i < MENU.length - 1 && styles.menuBorder]}>
            <Text style={styles.menuIcon}>{m.icon}</Text>
            <Text style={styles.menuLabel}>{m.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.version}>GymSlot v0.1.0 · Pay-per-slot, never per-month</Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.bg, fontSize: font.h2, fontWeight: '900' },
  name: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  muted: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xl,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { fontSize: 20 },
  menuLabel: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  version: { color: colors.textMuted, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.xl },
});
