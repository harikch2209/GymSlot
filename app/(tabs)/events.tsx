import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EVENTS } from '@/data/events';
import { colors, font, radius, spacing } from '@/theme';
import { Pill } from '@/components/ui';
import { inr } from '@/utils/format';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <FlatList
        data={EVENTS}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Try new workouts and discover new gyms — free or paid, no commitment.
          </Text>
        }
        renderItem={({ item }) => {
          const free = item.price === 0;
          const spotsLeft = item.capacity - item.reserved;
          return (
            <Pressable
              onPress={() => router.push(`/event/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.banner}>
                <Text style={styles.emoji}>{item.image}</Text>
                {free ? (
                  <Pill label="FREE" color={colors.bg} bg={colors.primary} style={styles.badge} />
                ) : (
                  <Pill
                    label={inr(item.price)}
                    color={colors.bg}
                    bg={colors.accent}
                    style={styles.badge}
                  />
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.gymName} · {item.category}
                </Text>
                <View style={styles.footerRow}>
                  <Text style={styles.when}>
                    {item.date} · {item.time}
                  </Text>
                  <Text style={[styles.spots, spotsLeft <= 5 && { color: colors.warning }]}>
                    {spotsLeft} spots left
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  banner: {
    height: 100,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44 },
  badge: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.lg, gap: 4 },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: font.small },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  when: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  spots: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
});
