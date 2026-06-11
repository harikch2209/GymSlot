import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGyms } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useLocation } from '@/hooks/useLocation';
import { AppText, Button, Ionicons, Stars } from '@/components/ui';
import { CrowdBadge } from '@/components/CrowdBadge';
import { colors, radius, shadow, spacing } from '@/theme';
import { distanceKm, fmtKm } from '@/utils/geo';
import { inr } from '@/utils/format';
import { Gym } from '@/types';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { effective, status } = useLocation();
  const { data } = useResource(fetchGyms, []);
  const [selected, setSelected] = useState<Gym | null>(null);

  const gyms = useMemo(
    () => (data ?? []).filter((g) => g.lat != null && g.lng != null),
    [data],
  );

  const region: Region = {
    latitude: effective.latitude,
    longitude: effective.longitude,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // react-native-maps has no web implementation; show a graceful note there.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="map-outline" size={40} color={colors.textSubtle} />
        <AppText variant="bodyStrong" style={{ marginTop: spacing.md }}>Map is available on the iOS & Android apps</AppText>
        <AppText variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>Open GymSlot in Expo Go to use the map.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={status === 'granted'}
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {gyms.map((g) => {
          const active = selected?.id === g.id;
          return (
            <Marker
              key={g.id}
              coordinate={{ latitude: g.lat!, longitude: g.lng! }}
              onPress={() => setSelected(g)}
              tracksViewChanges={false}
            >
              <View style={[styles.pin, active && styles.pinActive]}>
                <AppText variant="smallStrong" color={active ? colors.onPrimary : colors.ink}>
                  {inr(g.priceFrom)}
                </AppText>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + spacing.sm }]} accessibilityRole="button" accessibilityLabel="Back to list">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <View style={[styles.countPill, { top: insets.top + spacing.sm }]}>
        <Ionicons name="location" size={13} color={colors.primary} />
        <AppText variant="smallStrong">{gyms.length} gyms near you</AppText>
      </View>

      {selected && (
        <Pressable
          style={[styles.card, { bottom: insets.bottom + spacing.lg }]}
          onPress={() => router.push(`/gym/${selected.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${selected.name}`}
        >
          <Image source={{ uri: selected.imageUrl ?? undefined }} style={styles.cardImg} contentFit="cover" />
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="bodyStrong" numberOfLines={1}>{selected.name}</AppText>
            <View style={styles.cardMeta}>
              <Stars rating={selected.rating} reviews={selected.reviews} />
              <AppText variant="small" color={colors.textSubtle}>
                {' · '}{fmtKm(distanceKm(effective, { latitude: selected.lat!, longitude: selected.lng! }))}
              </AppText>
            </View>
            <CrowdBadge level={selected.crowd} />
          </View>
          <View style={styles.cardCta}>
            <AppText variant="tiny" color={colors.textSubtle}>FROM</AppText>
            <AppText variant="h3" color={colors.primary}>{inr(selected.priceFrom)}</AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  pin: {
    backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, ...shadow.md,
  },
  pinActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  backBtn: {
    position: 'absolute', left: spacing.lg, width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.md,
  },
  countPill: {
    position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 9,
    borderRadius: radius.pill, ...shadow.md,
  },
  card: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.lg,
  },
  cardImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardCta: { alignItems: 'center' },
});
