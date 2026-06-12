import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, type as T } from '@/theme';
import { CrowdLevel } from '@/types';
import { ago, crowdColor, crowdLabel } from '@/utils/format';
import { AppText } from './ui';

export function CrowdBadge({
  level, updatedMinsAgo, showTimestamp = false, onLight = false,
}: {
  level: CrowdLevel;
  updatedMinsAgo?: number;
  showTimestamp?: boolean;
  /** When true, renders a solid pill suitable for placing over a photo. */
  onLight?: boolean;
}) {
  const color = crowdColor(level);
  return (
    <View style={{ alignItems: 'flex-start', gap: 3 }}>
      <View
        style={[
          styles.badge,
          onLight
            ? { backgroundColor: 'rgba(255,255,255,0.95)' }
            : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <AppText variant="tiny" color={colors.text}>{crowdLabel(level)}</AppText>
      </View>
      {showTimestamp && updatedMinsAgo !== undefined && (
        <View style={onLight ? styles.tsChip : undefined}>
          <AppText variant={onLight ? 'tiny' : 'small'} color={onLight ? colors.text : colors.textSubtle}>
            {level === 'Unknown' ? `No signal · ${ago(updatedMinsAgo)}` : `Updated ${ago(updatedMinsAgo)}`}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tsChip: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
