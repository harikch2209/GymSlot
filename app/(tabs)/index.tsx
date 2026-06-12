import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchGyms } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useLocation } from '@/hooks/useLocation';
import { distanceKm } from '@/utils/geo';
import { GymCard } from '@/components/GymCard';
import { AppText, Avatar, Chip, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing, type as T } from '@/theme';
import { Amenity, CrowdLevel, Gym } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';

type SortKey = 'rating' | 'price' | 'distance';
const CROWD: CrowdLevel[] = ['Low', 'Moderate', 'High'];
const AMENITIES: Amenity[] = ['Cardio', 'Weights', 'Shower', 'Parking', 'AC'];

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { effective } = useLocation();
  const { data, loading, error, refreshing, refresh, reload } = useResource(fetchGyms, []);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [amenity, setAmenity] = useState<Amenity | null>(null);

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'there';

  // Inject real distance from the user's (or fallback) location.
  const located = useMemo<Gym[]>(
    () =>
      (data ?? []).map((g) =>
        g.lat != null && g.lng != null
          ? { ...g, distanceKm: Math.round(distanceKm(effective, { latitude: g.lat, longitude: g.lng }) * 10) / 10 }
          : g,
      ),
    [data, effective],
  );

  const gyms = useMemo<Gym[]>(() => {
    let list = located.filter((g) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || g.name.toLowerCase().includes(q) || g.area.toLowerCase().includes(q);
      const matchC = !crowd || g.crowd === crowd;
      const matchA = !amenity || g.amenities.includes(amenity);
      return matchQ && matchC && matchA;
    });
    list = [...list].sort((a, b) =>
      sort === 'price' ? a.priceFrom - b.priceFrom
        : sort === 'distance' ? (a.distanceKm ?? 99) - (b.distanceKm ?? 99)
          : b.rating - a.rating);
    return list;
  }, [located, query, sort, crowd, amenity]);

  return (
    <View style={styles.container}>
      <FlatList
        data={gyms}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GymCard gym={item} onPress={() => router.push(`/gym/${item.id}`)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + spacing.md }}>
            <View style={styles.topRow}>
              <View>
                <View style={styles.locRow}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <AppText variant="smallStrong" color={colors.textMuted}>Bengaluru</AppText>
                </View>
                <AppText variant="h1" style={{ marginTop: 2 }}>Hi {firstName} 👋</AppText>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push('/notifications')}
                  accessibilityRole="button"
                  accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                  hitSlop={8}
                  style={({ pressed }) => [styles.bell, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.text} />
                  {unreadCount > 0 && (
                    <View style={styles.bellBadge}>
                      <AppText variant="tiny" color={colors.onPrimary} style={{ fontSize: 9, lineHeight: 12 }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </AppText>
                    </View>
                  )}
                </Pressable>
                <Avatar name={(user?.user_metadata?.full_name as string) ?? 'GymSlot'} />
              </View>
            </View>

            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textSubtle} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search gym or area"
                placeholderTextColor={colors.textSubtle}
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Search gyms"
              />
              {query.length > 0 && (
                <Ionicons name="close-circle" size={18} color={colors.textSubtle} onPress={() => setQuery('')} />
              )}
            </View>

            <FlatList
              horizontal
              data={(['rating', 'price', 'distance'] as SortKey[])}
              keyExtractor={(s) => s}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
              renderItem={({ item }) => (
                <Chip label={item === 'rating' ? 'Top rated' : item === 'price' ? 'Lowest price' : 'Nearest'}
                  active={sort === item} onPress={() => setSort(item)} />
              )}
            />

            <View style={styles.filterChips}>
              {CROWD.map((c) => (
                <Chip key={c} label={`${c} crowd`} active={crowd === c} onPress={() => setCrowd(crowd === c ? null : c)} />
              ))}
              {AMENITIES.map((a) => (
                <Chip key={a} label={a} active={amenity === a} onPress={() => setAmenity(amenity === a ? null : a)} />
              ))}
            </View>

            <AppText variant="h2" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
              {loading ? 'Finding gyms…' : `${gyms.length} gym${gyms.length === 1 ? '' : 's'} near you`}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.lg }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.skeletonCard}>
                  <Skeleton height={168} radius={0} />
                  <View style={{ padding: spacing.lg, gap: 8 }}>
                    <Skeleton height={18} width="70%" />
                    <Skeleton height={13} width="45%" />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn't load gyms"
              body={error} action="Try again" onAction={reload} />
          ) : (
            <EmptyState icon="search-outline" title="No gyms match"
              body="Try widening your filters or searching a different area." />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/map')}
        accessibilityRole="button"
        accessibilityLabel="View gyms on a map"
        style={({ pressed }) => [styles.mapFab, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="map" size={17} color={colors.onPrimary} />
        <AppText variant="smallStrong" color={colors.onPrimary}>Map</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bell: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 3, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.surface,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, paddingHorizontal: spacing.md, marginTop: spacing.lg, ...shadow.sm,
  },
  searchInput: { flex: 1, paddingVertical: 14, ...T.body, color: colors.text },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  mapFab: {
    position: 'absolute', alignSelf: 'center', bottom: spacing.lg, flexDirection: 'row',
    alignItems: 'center', gap: 7, backgroundColor: colors.ink,
    paddingHorizontal: spacing.xl, paddingVertical: 13, borderRadius: radius.pill, ...shadow.lg,
  },
});
