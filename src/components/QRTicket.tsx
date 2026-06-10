import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, font, radius, spacing } from '@/theme';

export function QRTicket({
  payload,
  caption,
  checkedIn,
}: {
  payload: string;
  caption?: string;
  checkedIn?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.qrBox}>
        <QRCode value={payload} size={188} backgroundColor="#FFFFFF" color="#0B0F19" />
      </View>
      {checkedIn ? (
        <Text style={styles.used}>✓ Checked in — QR used</Text>
      ) : (
        <Text style={styles.caption}>{caption ?? 'Show this QR at the gym entrance'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  caption: { color: colors.textMuted, fontSize: font.small, textAlign: 'center' },
  used: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
});
