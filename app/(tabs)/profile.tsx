import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, shadow, spacing } from '@/theme';
import { AppText, Avatar, Card, Divider, Ionicons } from '@/components/ui';
import { inr } from '@/utils/format';

const MENU: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string }[] = [
  { icon: 'business-outline', label: 'List your gym (Partner)' },
  { icon: 'fitness-outline', label: 'Become a trainer' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'receipt-outline', label: 'GST invoices' },
  { icon: 'chatbubble-ellipses-outline', label: 'Help & WhatsApp support' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & terms' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, creditBalance } = useApp();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const name = (user?.user_metadata?.full_name as string) ?? 'GymSlot member';
  const email = user?.email ?? '';
  const completed = bookings.filter((b) => b.status === 'Completed').length;

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };
  const doSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <Avatar name={name} size={68} />
        <View style={{ flex: 1 }}>
          <AppText variant="h2">{name}</AppText>
          {!!email && <AppText variant="small" color={colors.textMuted}>{email}</AppText>}
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.stats} padded={false}>
          <Stat value={String(bookings.length)} label="Bookings" />
          <View style={styles.statDivider} />
          <Stat value={String(completed)} label="Sessions" />
          <View style={styles.statDivider} />
          <Stat value={inr(creditBalance)} label="Credits" />
        </Card>

        <Card style={{ marginTop: spacing.lg }} padded={false}>
          {MENU.map((m, i) => (
            <Pressable key={m.label} accessibilityRole="button" accessibilityLabel={m.label}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.menuIcon}><Ionicons name={m.icon} size={18} color={colors.text} /></View>
              <AppText variant="bodyStrong" style={{ flex: 1 }}>{m.label}</AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
              {i < MENU.length - 1 && <View style={styles.menuBorder} />}
            </Pressable>
          ))}
        </Card>

        <Pressable onPress={confirmSignOut} accessibilityRole="button" disabled={signingOut}
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <AppText variant="bodyStrong" color={colors.danger}>{signingOut ? 'Signing out…' : 'Sign out'}</AppText>
        </Pressable>

        <AppText variant="small" color={colors.textSubtle} style={{ textAlign: 'center', marginTop: spacing.xl }}>
          GymSlot v1.0.0 · Pay-per-slot, never per-month
        </AppText>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h3">{value}</AppText>
      <AppText variant="tiny" color={colors.textSubtle} style={{ marginTop: 2 }}>{label.toUpperCase()}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { padding: spacing.lg },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  menuBorder: { position: 'absolute', left: 64, right: 0, bottom: 0, height: 1, backgroundColor: colors.border },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.dangerTint, borderRadius: radius.md },
});
