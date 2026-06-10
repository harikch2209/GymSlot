import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';
import { CrowdLevel } from '@/types';
import { crowdColor, crowdLabel } from '@/utils/format';

export function CrowdBadge({
  level,
  updatedMinsAgo,
  showTimestamp = false,
}: {
  level: CrowdLevel;
  updatedMinsAgo?: number;
  showTimestamp?: boolean;
}) {
  const color = crowdColor(level);
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color }]}>{crowdLabel(level)}</Text>
      </View>
      {showTimestamp && updatedMinsAgo !== undefined && (
        <Text style={styles.timestamp}>
          {level === 'Unknown'
            ? `No signal for ${updatedMinsAgo} min`
            : `Updated ${updatedMinsAgo} min ago`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', gap: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: font.tiny, fontWeight: '800' },
  timestamp: { fontSize: 10, color: colors.textMuted },
});
