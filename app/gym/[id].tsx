import React from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGym, fetchGymEvents, fetchSlots } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { CrowdBadge } from '@/components/CrowdBadge';
import { ReviewsSection } from '@/components/ReviewsSection';
import { AppText, Badge, Button, Card, Divider, EmptyState, Ionicons, Skeleton, Stars } from '@/components/ui';
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
  const { data: gymEvents } = useResource(() => fetchGymEvents(id), [id]);
  const { data: previewSlots } = useResource(() => fetchSlots(id), [id]);

  const openDirections = () => {
    if (!gym) return;
    const q = gym.lat != null && gym.lng != null
      ? `${gym.lat},${gym.lng}`
      : encodeURIComponent(`${gym.name}, ${gym.area}, ${gym.city}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };

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
            <Divider />
            <Pressable onPress={openDirections} accessibilityRole="button" accessibilityLabel="Get directions"
              style={({ pressed }) => [styles.dirRow, pressed && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <AppText variant="smallStrong" color={colors.primary}>Get directions</AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
            </Pressable>
          </Card>

          {(previewSlots?.length ?? 0) > 0 && (
            <>
              <AppText variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Slots</AppText>
              <View style={styles.slotPreview}>
                {(previewSlots ?? []).slice(0, 6).map((s) => (
                  <View key={s.id} style={styles.slotChip}>
                    <AppText variant="smallStrong">{s.time}</AppText>
                    <AppText variant="tiny" color={colors.textSubtle}>{s.duration}m · {inr(s.price)}</AppText>
                  </View>
                ))}
              </View>
            </>
          )}

          <AppText variant="h2" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Amenities</AppText>
          <View style={styles.amenityGrid}>
            {gym.amenities.map((a) => (
              <View key={a} style={styles.amenity}>
                <Ionicons name={AMENITY_ICON[a] ?? 'ellipse-outline'} size={18} color={colors.primary} />
                <AppText variant="smallStrong">{a}</AppText>
              </View>
            ))}
          </View>

          {(gymEvents?.length ?? 0) > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <AppText variant="h2" style={{ marginBottom: spacing.md }}>Events here</AppText>
              <View style={{ gap: spacing.sm }}>
                {(gymEvents ?? []).map((e) => (
                  <Pressable key={e.id} onPress={() => router.push(`/event/${e.id}`)}
                    accessibilityRole="button" accessibilityLabel={`${e.title}, ${e.date}`}
                    style={({ pressed }) => [styles.eventRow, pressed && { opacity: 0.9 }]}>
                    <View style={styles.eventIcon}><Ionicons name="flash" size={16} color={colors.accent} /></View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>{e.title}</AppText>
                      <AppText variant="tiny" color={colors.textSubtle}>{e.date}{e.time ? ` · ${e.time}` : ''}</AppText>
                    </View>
                    <Badge label={e.price === 0 ? 'FREE' : inr(e.price)} color="#fff" bg={e.price === 0 ? colors.primary : colors.accent} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <ReviewsSection gymId={gym.id} />
          </View>

          <Card style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.warning} />
            </View>
            <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
              Off-peak slots are cheaper and far less crowded. Pick a slot on the next screen.
            </AppText>
          </Card>

          <Pressable
            onPress={() => router.push({ pathname: '/report', params: { type: 'gym', id: gym.id, label: gym.name } })}
            accessibilityRole="button" accessibilityLabel="Report this gym"
            style={({ pressed }) => [styles.reportLink, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="flag-outline" size={15} color={colors.textSubtle} />
            <AppText variant="smallStrong" color={colors.textSubtle}>Report this gym</AppText>
          </Pressable>
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
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl, paddingVertical: spacing.sm },
  dirRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  slotPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, alignItems: 'center', ...shadow.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
  eventIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
  },
});
