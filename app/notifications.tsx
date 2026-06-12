import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/context/NotificationsContext';
import { AppText, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { ago } from '@/utils/format';
import { AppNotification } from '@/types';

type Visual = { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };

function visualFor(type: string): Visual {
  switch (type) {
    case 'booking_confirmation': return { icon: 'checkmark-circle', color: colors.primary, bg: colors.primaryTint };
    case 'booking_cancelled': return { icon: 'close-circle', color: colors.danger, bg: colors.dangerTint };
    case 'refund_status': return { icon: 'wallet', color: colors.primary, bg: colors.primaryTint };
    case 'slot_reminder': return { icon: 'alarm', color: colors.warning, bg: colors.warningTint };
    case 'event_reminder':
    case 'event_nearby': return { icon: 'flash', color: colors.accent, bg: colors.accentTint };
    case 'credit_expiry': return { icon: 'hourglass', color: colors.warning, bg: colors.warningTint };
    case 'trainer_assigned': return { icon: 'person-circle', color: colors.primary, bg: colors.primaryTint };
    case 'trainer_unmatched': return { icon: 'person-remove', color: colors.danger, bg: colors.dangerTint };
    case 'gym_new_booking': return { icon: 'people', color: colors.accent, bg: colors.accentTint };
    default: return { icon: 'notifications', color: colors.textMuted, bg: colors.surfaceAlt };
  }
}

const minsAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, loading, refreshing, refresh, markRead, markAllRead } = useNotifications();

  const onPress = (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    const bookingId = (n.data?.bookingId as string | undefined) ?? n.reference ?? undefined;
    if (n.type === 'gym_new_booking') { router.push('/partner'); return; }
    if (bookingId && ['booking_confirmation', 'slot_reminder', 'refund_status', 'booking_cancelled'].includes(n.type)) {
      router.push(`/ticket/${bookingId}`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/notification-prefs')}
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
              hitSlop={10}
              style={({ pressed }) => [{ paddingHorizontal: 4 }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.topRow}>
              <AppText variant="small" color={colors.textMuted}>{unreadCount} unread</AppText>
              <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={8}>
                <AppText variant="smallStrong" color={colors.primary}>Mark all read</AppText>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const v = visualFor(item.type);
          return (
            <Pressable
              onPress={() => onPress(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                !item.read && styles.rowUnread,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: v.bg }]}>
                <Ionicons name={v.icon} size={18} color={v.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{item.title}</AppText>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <AppText variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{item.body}</AppText>
                <AppText variant="tiny" color={colors.textSubtle} style={{ marginTop: 6 }}>
                  {ago(minsAgo(item.at)).toUpperCase()}
                </AppText>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeleton}><Skeleton height={56} /></View>
              ))}
            </View>
          ) : (
            <EmptyState icon="notifications-outline" title="No notifications yet"
              body="Booking confirmations, reminders and refunds will show up here." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  row: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.sm,
  },
  rowUnread: { backgroundColor: colors.primaryTint },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  skeleton: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm },
});
