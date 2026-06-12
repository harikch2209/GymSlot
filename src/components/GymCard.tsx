import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, spacing, type as T } from '@/theme';
import { Gym } from '@/types';
import { inr, isOpenNow } from '@/utils/format';
import { AppText, Ionicons, Stars } from './ui';
import { CrowdBadge } from './CrowdBadge';

const BLUR = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function GymCard({ gym, onPress }: { gym: Gym; onPress: () => void }) {
  const open = isOpenNow(gym.timings);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${gym.name} in ${gym.area}, rated ${gym.rating} out of 5, from ${inr(gym.priceFrom)} per slot`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.96, transform: [{ scale: 0.992 }] }]}
    >
      <View>
        <Image
          source={{ uri: gym.imageUrl ?? undefined }}
          placeholder={BLUR}
          transition={250}
          contentFit="cover"
          style={styles.image}
        />
        <LinearGradient
          colors={['transparent', 'rgba(14,17,22,0.0)', 'rgba(14,17,22,0.55)']}
          style={styles.scrim}
        />
        <View style={styles.crowdOverlay}>
          <CrowdBadge level={gym.crowd} updatedMinsAgo={gym.crowdUpdatedMinsAgo} showTimestamp onLight />
        </View>
        <View style={styles.priceOverlay}>
          <AppText variant="tiny" color={colors.textMuted}>FROM</AppText>
          <AppText variant="h3" color={colors.text}>{inr(gym.priceFrom)}</AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>{gym.name}</AppText>
          <Stars rating={gym.rating} reviews={gym.reviews} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSubtle} />
          <AppText variant="small" color={colors.textMuted}>
            {gym.area}{gym.distanceKm != null ? ` · ${gym.distanceKm} km` : ''}
          </AppText>
          {open != null && (
            <View style={styles.openRow}>
              <View style={[styles.dot, { backgroundColor: open ? colors.primary : colors.danger }]} />
              <AppText variant="tiny" color={open ? colors.primary : colors.danger}>{open ? 'Open now' : 'Closed'}</AppText>
            </View>
          )}
        </View>
        <View style={styles.amenityRow}>
          {gym.amenities.slice(0, 4).map((a) => (
            <View key={a} style={styles.amenityTag}>
              <AppText variant="tiny" color={colors.textMuted}>{a}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden', ...shadow.sm },
  image: { width: '100%', height: 168, backgroundColor: colors.surfaceSunken },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  crowdOverlay: { position: 'absolute', top: spacing.md, left: spacing.md },
  priceOverlay: {
    position: 'absolute', bottom: spacing.md, right: spacing.md, alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 4,
  },
  body: { padding: spacing.lg, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  amenityTag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
});
