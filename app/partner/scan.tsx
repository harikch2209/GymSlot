import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingIdFromQr, partnerCheckin, partnerCheckinByCode } from '@/lib/api';
import { AppText, Button, Ionicons } from '@/components/ui';
import { colors, radius, spacing, type as Ty } from '@/theme';

type Attempt = { kind: 'id' | 'code'; value: string };
type Result = { ok: boolean; title: string; detail: string; canOverride?: boolean } | null;

export default function PartnerScan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [code, setCode] = useState('');
  const lock = useRef(false);
  const lastAttempt = useRef<Attempt | null>(null);

  const runAttempt = async (attempt: Attempt, override: boolean) => {
    lastAttempt.current = attempt;
    setBusy(true);
    try {
      const b = attempt.kind === 'id'
        ? await partnerCheckin(attempt.value, override)
        : await partnerCheckinByCode(attempt.value, null, override);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult({ ok: true, title: 'Checked in ✓', detail: `${b.memberName ?? 'Member'} · ${b.title}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try again.';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setResult({ ok: false, title: 'Check-in failed', detail: msg, canOverride: /override/i.test(msg) });
    } finally {
      setBusy(false);
    }
  };

  const onScan = async ({ data }: { data: string }) => {
    if (lock.current || busy) return;
    lock.current = true;
    const id = bookingIdFromQr(data);
    if (!id) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setResult({ ok: false, title: 'Not a GymSlot ticket', detail: 'That QR isn’t a valid booking.' });
      return;
    }
    await runAttempt({ kind: 'id', value: id }, false);
  };

  const submitCode = async () => {
    const c = code.trim();
    if (c.length < 4) return;
    setManualOpen(false);
    lock.current = true;
    await runAttempt({ kind: 'code', value: c }, false);
  };

  const scanAgain = () => { setResult(null); setCode(''); lastAttempt.current = null; lock.current = false; };
  const forceOverride = () => { if (lastAttempt.current) runAttempt(lastAttempt.current, true); };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={40} color={colors.textSubtle} />
        <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>Camera access needed</AppText>
        <AppText variant="small" color={colors.textMuted} style={{ marginTop: 6, textAlign: 'center' }}>
          To scan member tickets, allow camera access — or enter the member’s code manually.
        </AppText>
        <Button title="Allow camera" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
        <Button title="Enter code manually" variant="secondary" onPress={() => setManualOpen(true)} style={{ marginTop: spacing.sm }} />
        <Button title="Back" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
        <ManualModal open={manualOpen} code={code} setCode={setCode} onSubmit={submitCode} onClose={() => setManualOpen(false)} />
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

      {!result && (
        <Pressable onPress={() => setManualOpen(true)} style={[styles.codeFab, { bottom: insets.bottom + spacing.xl }]}
          accessibilityRole="button" accessibilityLabel="Enter code manually">
          <Ionicons name="keypad-outline" size={18} color="#fff" />
          <AppText variant="smallStrong" color="#fff">Enter code</AppText>
        </Pressable>
      )}

      {result && (
        <View style={[styles.resultCard, { bottom: insets.bottom + spacing.xl }]}>
          <View style={[styles.resultIcon, { backgroundColor: result.ok ? colors.primaryTint : colors.dangerTint }]}>
            <Ionicons name={result.ok ? 'checkmark' : 'close'} size={24} color={result.ok ? colors.primary : colors.danger} />
          </View>
          <AppText variant="h3" style={{ marginTop: spacing.sm }}>{result.title}</AppText>
          <AppText variant="small" color={colors.textMuted} style={{ marginTop: 2, textAlign: 'center' }}>{result.detail}</AppText>
          {result.canOverride && (
            <Button title="Force check-in (override window)" variant="secondary" loading={busy} onPress={forceOverride} fullWidth style={{ marginTop: spacing.lg }} />
          )}
          <Button title="Scan another" onPress={scanAgain} fullWidth style={{ marginTop: spacing.sm }} />
          <Button title="Done" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: spacing.sm }} />
        </View>
      )}

      <ManualModal open={manualOpen} code={code} setCode={setCode} onSubmit={submitCode} onClose={() => setManualOpen(false)} />
    </View>
  );
}

function ManualModal({ open, code, setCode, onSubmit, onClose }: {
  open: boolean; code: string; setCode: (s: string) => void; onSubmit: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <AppText variant="h3">Enter check-in code</AppText>
        <AppText variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
          The 6-digit code on the member’s ticket.
        </AppText>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          placeholderTextColor={colors.textSubtle}
          style={styles.codeInput}
          maxLength={6}
          autoFocus
        />
        <Button title="Check in" onPress={onSubmit} disabled={code.trim().length < 4} fullWidth style={{ marginTop: spacing.md }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 250, height: 250, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: radius.xl },
  close: { position: 'absolute', left: spacing.lg, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.pill },
  codeFab: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill },
  resultCard: { position: 'absolute', left: spacing.lg, right: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  resultIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.lg },
  codeInput: { ...Ty.h2, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, textAlign: 'center', letterSpacing: 8 },
});
