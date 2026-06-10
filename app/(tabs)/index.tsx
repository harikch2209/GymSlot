import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GYMS } from '@/data/gyms';
import { GymCard } from '@/components/GymCard';
import { colors, font, radius, spacing } from '@/theme';
import { Amenity, CrowdLevel } from '@/types';

type SortKey = 'distance' | 'price' | 'rating';

const CROWD_FILTERS: CrowdLevel[] = ['Low', 'Moderate', 'High'];
const AMENITY_FILTERS: Amenity[] = ['Cardio', 'Weights', 'Shower', 'Parking', 'AC'];

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('distance');
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [amenity, setAmenity] = useState<Amenity | null>(null);

  const data = useMemo(() => {
    let list = GYMS.filter((g) => {
      const matchesQuery =
        !query ||
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.area.toLowerCase().includes(query.toLowerCase());
      const matchesCrowd = !crowd || g.crowd === crowd;
      const matchesAmenity = !amenity || g.amenities.includes(amenity);
      return matchesQuery && matchesCrowd && matchesAmenity;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return a.priceFrom - b.priceFrom;
      if (sort === 'rating') return b.rating - a.rating;
      return a.distanceKm - b.distanceKm;
    });
    return list;
  }, [query, sort, crowd, amenity]);

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GymCard gym={item} onPress={() => router.push(`/gym/${item.id}`)} />
        )}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search gym or area"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
            </View>

            <FilterRow title="Sort">
              {(['distance', 'price', 'rating'] as SortKey[]).map((s) => (
                <Chip key={s} label={cap(s)} active={sort === s} onPress={() => setSort(s)} />
              ))}
            </FilterRow>

            <FilterRow title="Crowd">
              {CROWD_FILTERS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={crowd === c}
                  onPress={() => setCrowd(crowd === c ? null : c)}
                />
              ))}
            </FilterRow>

            <FilterRow title="Amenities">
              {AMENITY_FILTERS.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  active={amenity === a}
                  onPress={() => setAmenity(amenity === a ? null : a)}
                />
              ))}
            </FilterRow>

            <Text style={styles.resultCount}>
              {data.length} gym{data.length === 1 ? '' : 's'} within 5 km
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No gyms match your filters. Try widening them.</Text>
        }
      />
    </View>
  );
}

function FilterRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: font.body, paddingVertical: 12 },
  filterRow: { marginBottom: spacing.sm },
  filterTitle: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  chipTextActive: { color: colors.bg },
  resultCount: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
