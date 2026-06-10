import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchEvents } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Badge, EmptyState, Ionicons, Skeleton } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { inr } from '@/utils/format';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useResource(fetchEvents, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <AppText variant="small" color={colors.textMuted} style={{ marginBottom: spacing.md, lineHeight: 20 }}>
            Try new workouts and discover new gyms — free or paid, no commitment.
          </AppText>
        }
        renderItem={({ item }) => {
          const free = item.price === 0;
          const spotsLeft = item.capacity - item.reserved;
          return (
            <Pressable onPress={() => router.push(`/event/${item.id}`)}
              accessibilityRole="button" accessibilityLabel={`${item.title} at ${item.gymName}, ${item.date}`}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}>
              <View>
                <Image source={{ uri: item.imageUrl ?? undefined }} style={styles.banner} contentFit="cover" transition={250} />
                <LinearGradient colors={['transparent', 'rgba(14,17,22,0.5)']} style={styles.scrim} />
                <View style={styles.badgePos}>
                  {free
                    ? <Badge label="FREE" color="#fff" bg={colors.primary} />
                    : <Badge label={inr(item.price)} color="#fff" bg={colors.accent} />}
                </View>
                <AppText variant="tiny" color="#fff" style={styles.categoryPos}>{item.category.toUpperCase()}</AppText>
              </View>
              <View style={styles.body}>
                <AppText variant="h3" numberOfLines={1}>{item.title}</AppText>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textSubtle} />
                  <AppText variant="small" color={colors.textMuted}>{item.gymName}</AppText>
                </View>
                <View style={styles.footerRow}>
                  <View style={styles.whenRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                    <AppText variant="smallStrong">{item.date} · {item.time}</AppText>
                  </View>
                  <AppText variant="smallStrong" color={spotsLeft <= 5 ? colors.warning : colors.textMuted}>
                    {spotsLeft} spots left
                  </AppText>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.lg }}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.card}>
                  <Skeleton height={150} radius={0} />
                  <View style={{ padding: spacing.lg, gap: 8 }}><Skeleton height={18} width="65%" /><Skeleton height={13} width="40%" /></View>
                </View>
              ))}
            </View>
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn't load events" body={error} action="Try again" onAction={reload} />
          ) : (
            <EmptyState icon="flash-outline" title="No events right now" body="Check back soon for bootcamps, workshops and open houses." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, ...shadow.sm },
  banner: { width: '100%', height: 150, backgroundColor: colors.surfaceSunken },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  badgePos: { position: 'absolute', top: spacing.md, right: spacing.md },
  categoryPos: { position: 'absolute', bottom: spacing.md, left: spacing.md },
  body: { padding: spacing.lg, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
