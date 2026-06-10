import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius, spacing } from '@/theme';
import { AppText, Ionicons } from './ui';

export function QRTicket({
  payload, caption, checkedIn,
}: { payload: string; caption?: string; checkedIn?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.qrBox, checkedIn && { opacity: 0.35 }]}>
        <QRCode value={payload} size={196} backgroundColor="#FFFFFF" color={colors.ink} />
      </View>
      {checkedIn ? (
        <View style={styles.usedRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <AppText variant="bodyStrong" color={colors.primary}>Checked in — QR used</AppText>
        </View>
      ) : (
        <AppText variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>
          {caption ?? 'Show this QR at the gym entrance'}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  qrBox: { backgroundColor: '#FFFFFF', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  usedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
