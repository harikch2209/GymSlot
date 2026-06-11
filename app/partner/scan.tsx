import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingIdFromQr, partnerCheckin } from '@/lib/api';
import { AppText, Button, Ionicons } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type Result = { ok: boolean; title: string; detail: string } | null;

export default function PartnerScan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const onScan = async ({ data }: { data: string }) => {
    if (lock.current || busy) return;
    lock.current = true;
    const id = bookingIdFromQr(data);
    if (!id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setResult({ ok: false, title: 'Not a GymSlot ticket', detail: 'That QR isn’t a valid booking.' });
      return;
    }
    setBusy(true);
    try {
      const b = await partnerCheckin(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult({ ok: true, title: 'Checked in ✓', detail: `${b.memberName ?? 'Member'} · ${b.title}` });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setResult({ ok: false, title: 'Check-in failed', detail: e instanceof Error ? e.message : 'Try again.' });
    } finally {
      setBusy(false);
    }
  };

  const scanAgain = () => { setResult(null); lock.current = false; };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={40} color={colors.textSubtle} />
        <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>Camera access needed</AppText>
        <AppText variant="small" color={colors.textMuted} style={{ marginTop: 6, textAlign: 'center' }}>
          To scan member tickets, allow camera access.
        </AppText>
        <Button title="Allow camera" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
        <Button title="Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : onScan}
      />
      <View style={styles.overlay}>
        <View style={[styles.frame, result?.ok === true && { borderColor: colors.primary }, result?.ok === false && { borderColor: colors.danger }]} />
      </View>

      <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + spacing.sm }]} accessibilityRole="button" accessibilityLabel="Close scanner">
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>

      <View style={[styles.hint, { top: insets.top + spacing.sm }]}>
        <AppText variant="smallStrong" color="#fff">Point at the member’s QR</AppText>
      </View>

      {result && (
        <View style={[styles.resultCard, { bottom: insets.bottom + spacing.xl }]}>
          <View style={[styles.resultIcon, { backgroundColor: result.ok ? colors.primaryTint : colors.dangerTint }]}>
            <Ionicons name={result.ok ? 'checkmark' : 'close'} size={24} color={result.ok ? colors.primary : colors.danger} />
          </View>
          <AppText variant="h3" style={{ marginTop: spacing.sm }}>{result.title}</AppText>
          <AppText variant="small" color={colors.textMuted} style={{ marginTop: 2, textAlign: 'center' }}>{result.detail}</AppText>
          <Button title="Scan another" onPress={scanAgain} fullWidth style={{ marginTop: spacing.lg }} />
          <Button title="Done" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: spacing.sm }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 250, height: 250, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: radius.xl },
  close: { position: 'absolute', left: spacing.lg, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.pill },
  resultCard: { position: 'absolute', left: spacing.lg, right: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  resultIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
