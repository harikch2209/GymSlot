import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMyReports, fetchOpenReports, isAdmin, issueGoodwill, resolveReport } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { AppText, Badge, Button, Card, Ionicons } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { Report, ReportStatus } from '@/types';
import { ago } from '@/utils/format';

const SUPPORT_WHATSAPP = '918000000000'; // GymSlot support line (placeholder)

const FAQS: { q: string; a: string }[] = [
  { q: 'How do I cancel or get a refund?', a: 'Open the booking from the Bookings tab and tap Cancel. Inside the free-cancel window you can take instant credits (with a 5% bonus) or a refund to your original payment method.' },
  { q: 'How does check-in work?', a: 'Show the QR on your ticket at the gym, or share your 6-digit code if the scanner is busy. Check-in opens 10 minutes before your slot.' },
  { q: 'What do the crowd levels mean?', a: 'Low/Moderate/High/Full reflect live occupancy. “Not available” means the reading is stale. Off-peak slots are usually cheaper and quieter.' },
  { q: 'Can I add a personal trainer?', a: 'Yes — pick a trainer on the booking screen. Their fee is added to your slot. If no trainer accepts, you’re notified and refunded automatically.' },
  { q: 'How do credits work?', a: 'Credits come from cancellations, promos and goodwill. They apply to any slot, trainer or paid event, and can be combined with cash at checkout.' },
];

const STATUS_BADGE: Record<ReportStatus, { color: string; bg: string }> = {
  open: { color: colors.warning, bg: colors.warningTint },
  reviewing: { color: colors.accent, bg: colors.accentTint },
  resolved: { color: colors.primary, bg: colors.primaryTint },
  dismissed: { color: colors.textMuted, bg: colors.surfaceAlt },
};

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const admin = useResource(isAdmin, []);
  const myReports = useResource(fetchMyReports, []);
  const openReports = useResource(fetchOpenReports, []);
  const isReviewer = admin.data === true;

  const openWhatsApp = async () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi GymSlot support, I need help with…')}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
    else Alert.alert('WhatsApp unavailable', `Reach us on WhatsApp at +${SUPPORT_WHATSAPP}.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>

      <Card style={styles.waCard}>
        <View style={styles.waIcon}><Ionicons name="logo-whatsapp" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Chat with support</AppText>
          <AppText variant="small" color={colors.textMuted}>We usually reply within a few minutes.</AppText>
        </View>
        <Button title="WhatsApp" size="sm" onPress={openWhatsApp} />
      </Card>

      <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>FAQs</AppText>
      <Card padded={false}>
        {FAQS.map((f, i) => (
          <View key={f.q} style={[styles.faqItem, i < FAQS.length - 1 && styles.faqBorder]}>
            <Pressable onPress={() => setOpenFaq(openFaq === i ? null : i)} style={styles.faqHead} accessibilityRole="button">
              <AppText variant="bodyStrong" style={{ flex: 1 }}>{f.q}</AppText>
              <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSubtle} />
            </Pressable>
            {openFaq === i && <AppText variant="small" color={colors.textMuted} style={{ lineHeight: 20, marginTop: spacing.sm }}>{f.a}</AppText>}
          </View>
        ))}
      </Card>

      {isReviewer && (openReports.data?.length ?? 0) > 0 && (
        <>
          <View style={styles.sectionRow}>
            <AppText variant="h3">Support queue</AppText>
            <Badge label={`${openReports.data?.length} open`} color={colors.warning} bg={colors.warningTint} />
          </View>
          {(openReports.data ?? []).map((r) => (
            <ReportRow key={r.id} report={r} admin onChanged={() => { openReports.reload(); myReports.reload(); }} />
          ))}
        </>
      )}

      <AppText variant="h3" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Your reports</AppText>
      {(myReports.data?.length ?? 0) === 0
        ? <AppText variant="small" color={colors.textSubtle}>You haven’t reported anything. You can report a gym or trainer from its page.</AppText>
        : (myReports.data ?? []).map((r) => <ReportRow key={r.id} report={r} onChanged={myReports.reload} />)}

      <AppText variant="small" color={colors.textSubtle} style={{ textAlign: 'center', marginTop: spacing.xxl }}>
        GymSlot · support@gymslot.app
      </AppText>
    </ScrollView>
  );
}

function ReportRow({ report, admin, onChanged }: { report: Report; admin?: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const badge = STATUS_BADGE[report.status];
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(report.at).getTime()) / 60000));
  const act = async (status: ReportStatus) => {
    setBusy(true);
    try { await resolveReport(report.id, status); onChanged(); }
    catch (e) { Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const goodwill = () => {
    const give = async (amount: number) => {
      setBusy(true);
      try { await issueGoodwill(report.reporterId, amount, `Goodwill re: ${report.reason}`); Alert.alert('Credits sent', `₹${amount} added to the member’s wallet.`); }
      catch (e) { Alert.alert('Could not issue', e instanceof Error ? e.message : 'Try again.'); }
      finally { setBusy(false); }
    };
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt('Goodwill credits', 'Amount (₹) for the reporter:', (v) => { const n = Number(v); if (n > 0) give(n); }, 'plain-text', '250', 'number-pad');
    } else {
      Alert.alert('Goodwill credits', 'Add credits to the reporter’s wallet', [
        { text: 'Cancel', style: 'cancel' },
        { text: '₹100', onPress: () => give(100) },
        { text: '₹250', onPress: () => give(250) },
        { text: '₹500', onPress: () => give(500) },
      ]);
    }
  };
  return (
    <Card style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
      <View style={styles.reportTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{report.reason}</AppText>
          <AppText variant="tiny" color={colors.textSubtle}>
            {report.subjectType}{report.subjectLabel ? ` · ${report.subjectLabel}` : ''} · {ago(minsAgo)}
          </AppText>
        </View>
        <Badge label={report.status} color={badge.color} bg={badge.bg} />
      </View>
      {!!report.details && <AppText variant="small" color={colors.textMuted}>{report.details}</AppText>}
      {!!report.resolution && <AppText variant="small" color={colors.primary}>Resolution: {report.resolution}</AppText>}
      {admin && (report.status === 'open' || report.status === 'reviewing') && (
        <View style={styles.reportActions}>
          <Button title="Dismiss" variant="ghost" size="sm" loading={busy} onPress={() => act('dismissed')} style={{ flex: 1 }} />
          <Button title="Goodwill" variant="secondary" size="sm" icon="gift-outline" loading={busy} onPress={goodwill} style={{ flex: 1 }} />
          <Button title="Resolve" size="sm" loading={busy} onPress={() => act('resolved')} style={{ flex: 1 }} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  waCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  faqItem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
