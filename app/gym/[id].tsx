import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGym } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { CrowdBadge } from '@/components/CrowdBadge';
import { AppText, Button, Card, Divider, EmptyState, Ionicons, Skeleton, Stars } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Amenity } from '@/types';
import { inr } from '@/utils/format';

const { width } = Dimensions.get('window');

const AMENITY_ICON: Record<Amenity, keyof typeof Ionicons.glyphMap> = {
  Cardio: 'heart-outline', Weights: 'barbell-outline', Shower: 'water-outline',
  Parking: 'car-outline', AC: 'snow-outline', Locker: 'lock-closed-outline', CrossFit: 'fitness-outline',
};

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: gym, loading, error, reload } = useResource(() => fetchGym(id), [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton height={300} radius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={26} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={120} />
        </View>
      </View>
    );
  }
  if (error || !gym) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <EmptyState icon="cloud-offline-outline" title="Gym not available" body={error ?? undefined}
          action="Retry" onAction={reload} />
      </View>
    );
  }

  const gallery = gym.images.length ? gym.images : gym.imageUrl ? [gym.imageUrl] : [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {gallery.map((uri, i) => (
            <Image key={i} source={{ uri }} contentFit="cover" transition={250} style={{ width, height: 300 }} />
          ))}
        </ScrollView>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <AppText variant="h1" style={{ flex: 1 }}>{gym.name}</AppText>
            <Stars rating={gym.rating} reviews={gym.reviews} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSubtle} />
            <AppText variant="small" color={colors.textMuted}>
              {gym.area}{gym.distanceKm != null ? ` · ${gym.distanceKm} km away` : ''}
            </AppText>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <CrowdBadge level={gym.crowd} updatedMinsAgo={gym.crowdUpdatedMinsAgo} showTimestamp />
          </View>

          <Card style={{ marginTop: spacing.lg }}>
            <AppText variant="body" color={colors.textMuted} style={{ lineHeight: 23 }}>{gym.about}</AppText>
            <Divider />
            <Row icon="time-outline" label="Timings" value={gym.timings} />
            <Row icon="pricetag-outline" label="Price from" value={`${inr(gym.priceFrom)} / slot`} />
          </Card>

          <AppText variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Amenities</AppText>
          <View style={styles.amenityGrid}>
            {gym.amenities.map((a) => (
              <View key={a} style={styles.amenity}>
                <Ionicons name={AMENITY_ICON[a] ?? 'ellipse-outline'} size={18} color={colors.primary} />
                <AppText variant="smallStrong">{a}</AppText>
              </View>
            ))}
          </View>

          <Card style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.warning} />
            </View>
            <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
              Off-peak slots are cheaper and far less crowded. Pick a slot on the next screen.
            </AppText>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Continue to booking" icon="arrow-forward" fullWidth onPress={() => router.push(`/book/${gym.id}`)} />
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={colors.textSubtle} />
        <AppText variant="small" color={colors.textMuted}>{label}</AppText>
      </View>
      <AppText variant="smallStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  sheet: {
    backgroundColor: colors.bgSubtle, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -28, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenity: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, ...shadow.sm,
  },
  tipIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warningTint, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
  },
});
