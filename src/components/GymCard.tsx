import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';
import { Gym } from '@/types';
import { inr } from '@/utils/format';
import { CrowdBadge } from './CrowdBadge';

export function GymCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.banner}>
        <Text style={styles.emoji}>{gym.image}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {gym.name}
          </Text>
          <Text style={styles.rating}>★ {gym.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.meta}>
          {gym.area} · {gym.distanceKm} km away
        </Text>
        <View style={styles.footerRow}>
          <CrowdBadge level={gym.crowd} />
          <Text style={styles.price}>
            from <Text style={styles.priceValue}>{inr(gym.priceFrom)}</Text>/slot
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  banner: {
    height: 96,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 48 },
  body: { padding: spacing.lg, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontSize: font.h3, fontWeight: '800', flex: 1, marginRight: 8 },
  rating: { color: colors.warning, fontSize: font.small, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: font.small },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: { color: colors.textMuted, fontSize: font.small },
  priceValue: { color: colors.text, fontWeight: '800', fontSize: font.body },
});
