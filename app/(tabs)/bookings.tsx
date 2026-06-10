import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { colors, font, radius, spacing } from '@/theme';
import { Button, Card, Pill } from '@/components/ui';
import { inr } from '@/utils/format';
import { Booking } from '@/types';

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, cancelBooking } = useApp();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const filtered = bookings.filter((b) =>
    tab === 'upcoming' ? b.status === 'Confirmed' : b.status !== 'Confirmed',
  );

  const onCancel = (b: Booking) => {
    Alert.alert(
      'Cancel booking?',
      'Choose how you want your refund. Instant credits include a 5% bonus.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Refund to source',
          onPress: () => cancelBooking(b.id, false),
        },
        {
          text: 'Instant credits +5%',
          onPress: () => cancelBooking(b.id, true),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gymName}>{item.gymName}</Text>
                <Text style={styles.muted}>
                  {item.date} · {item.title}
                </Text>
              </View>
              <Pill
                label={item.status}
                color={
                  item.status === 'Confirmed'
                    ? colors.primary
                    : item.status === 'Completed'
                      ? colors.accent
                      : colors.danger
                }
              />
            </View>

            {item.trainerName && (
              <Text style={styles.trainer}>🏋️ Trainer: {item.trainerName}</Text>
            )}

            <View style={styles.divider} />
            <View style={styles.footerRow}>
              <Text style={styles.amount}>{inr(item.amountPaid + item.creditsUsed)}</Text>
              <View style={styles.actions}>
                <Button
                  title="View QR"
                  variant="secondary"
                  onPress={() => router.push(`/ticket/${item.id}`)}
                  style={styles.actionBtn}
                />
                {item.status === 'Confirmed' && (
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => onCancel(item)}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.muted}>
              No {tab} bookings yet. Find a gym and book your first slot.
            </Text>
            {tab === 'upcoming' && (
              <Button
                title="Discover gyms"
                onPress={() => router.push('/(tabs)')}
                style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
              />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xl },
  tabBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { color: colors.textMuted, fontSize: font.body, fontWeight: '700' },
  tabTextActive: { color: colors.text },
  tabUnderline: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 6,
  },
  muted: { color: colors.textMuted, fontSize: font.small, marginTop: 2, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gymName: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  trainer: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { height: 40, paddingHorizontal: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xxl * 2, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
});
