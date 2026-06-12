import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGym, upsertGymKyc } from '@/lib/api';
import { AppText, Button, Card, Chip, Field, Ionicons } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { Amenity } from '@/types';

const AMENITIES: Amenity[] = ['Cardio', 'Weights', 'Shower', 'Parking', 'AC', 'Locker', 'CrossFit'];
const STEPS = ['Basics', 'Details', 'Slots', 'Payouts', 'Review'];

interface SlotDraft { time: string; duration: 30 | 60; price: string; capacity: string; peak: boolean }
const emptySlot = (): SlotDraft => ({ time: '', duration: 60, price: '', capacity: '12', peak: false });

export default function RegisterGym() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // basics
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [about, setAbout] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  // details
  const [timings, setTimings] = useState('6:00 AM – 10:00 PM');
  const [capacity, setCapacity] = useState('40');
  const [amenities, setAmenities] = useState<Amenity[]>(['Weights', 'Cardio']);
  // slots
  const [slots, setSlots] = useState<SlotDraft[]>([{ time: '6:00 AM', duration: 60, price: '250', capacity: '15', peak: false }]);
  // kyc
  const [legalName, setLegalName] = useState('');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const toggleAmenity = (a: Amenity) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const setSlot = (i: number, patch: Partial<SlotDraft>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSlot = () => setSlots((prev) => [...prev, emptySlot()]);
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const validStep = (): string | null => {
    if (step === 0) {
      if (!name.trim()) return 'Add your gym’s name.';
      if (!area.trim()) return 'Add the area / locality.';
    }
    if (step === 1) {
      if (!(Number(capacity) > 0)) return 'Capacity must be a positive number.';
    }
    if (step === 2) {
      const ok = slots.filter((s) => s.time.trim() && Number(s.price) >= 0);
      if (ok.length === 0) return 'Add at least one slot with a time and price.';
    }
    return null;
  };

  const next = () => {
    const err = validStep();
    if (err) { Alert.alert('Almost there', err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const cleanSlots = slots
        .filter((s) => s.time.trim())
        .map((s) => ({
          time: s.time.trim(),
          duration: s.duration,
          price: Math.max(0, Number(s.price) || 0),
          capacity: Math.max(1, Number(s.capacity) || 12),
          peak: s.peak,
        }));
      const gym = await createGym({
        name: name.trim(),
        area: area.trim(),
        city: city.trim() || 'Bengaluru',
        about: about.trim() || null,
        timings: timings.trim() || null,
        imageUrl: imageUrl.trim() || null,
        amenities,
        effectiveCapacity: Math.max(1, Number(capacity) || 40),
        slots: cleanSlots,
      });
      if (legalName || pan || gstin || bankName || bankAccount || bankIfsc) {
        await upsertGymKyc({
          gymId: gym.id, legalName, pan, gstin,
          bankAccountName: bankName, bankAccountNumber: bankAccount, bankIfsc,
        });
      }
      router.replace({ pathname: '/partner/gym/[id]', params: { id: gym.id } });
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={back} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={colors.text} />
        </Pressable>
        <AppText variant="h3">List your gym</AppText>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                : <AppText variant="tiny" color={i <= step ? colors.onPrimary : colors.textSubtle}>{i + 1}</AppText>}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>
      <AppText variant="smallStrong" color={colors.textMuted} style={styles.stepLabel}>
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </AppText>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={{ gap: spacing.md }}>
            <Field label="Gym name" value={name} onChangeText={setName} placeholder="Iron Paradise" icon="business-outline" />
            <Field label="Area / locality" value={area} onChangeText={setArea} placeholder="Indiranagar" icon="location-outline" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="Bengaluru" icon="map-outline" />
            <Field label="About (optional)" value={about} onChangeText={setAbout} placeholder="What makes your gym great?" multiline />
            <Field label="Cover image URL (optional)" value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" icon="image-outline" />
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: spacing.lg }}>
            <Field label="Opening hours" value={timings} onChangeText={setTimings} placeholder="6:00 AM – 10:00 PM" icon="time-outline" />
            <Field label="Floor capacity (for live crowd)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" icon="people-outline" />
            <View>
              <AppText variant="smallStrong" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>Amenities</AppText>
              <View style={styles.chips}>
                {AMENITIES.map((a) => (
                  <Chip key={a} label={a} active={amenities.includes(a)} onPress={() => toggleAmenity(a)} />
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: spacing.md }}>
            <AppText variant="small" color={colors.textMuted}>
              Define the slots members can book. Duration is 30 or 60 min; capacity is the max bookings per slot.
            </AppText>
            {slots.map((s, i) => (
              <Card key={i} style={{ gap: spacing.sm }}>
                <View style={styles.slotHeadRow}>
                  <AppText variant="bodyStrong">Slot {i + 1}</AppText>
                  {slots.length > 1 && (
                    <Pressable onPress={() => removeSlot(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove slot">
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
                <Field label="Time" value={s.time} onChangeText={(t) => setSlot(i, { time: t })} placeholder="6:00 AM" />
                <View style={styles.row2}>
                  <Field style={{ flex: 1 }} label="Price (₹)" value={s.price} onChangeText={(t) => setSlot(i, { price: t })} keyboardType="number-pad" />
                  <Field style={{ flex: 1 }} label="Capacity" value={s.capacity} onChangeText={(t) => setSlot(i, { capacity: t })} keyboardType="number-pad" />
                </View>
                <View style={styles.row2}>
                  {([30, 60] as const).map((d) => (
                    <Chip key={d} label={`${d} min`} active={s.duration === d} onPress={() => setSlot(i, { duration: d })} />
                  ))}
                  <Chip label="Peak" active={s.peak} onPress={() => setSlot(i, { peak: !s.peak })} />
                </View>
              </Card>
            ))}
            <Button title="Add another slot" variant="secondary" icon="add" onPress={addSlot} />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: spacing.md }}>
            <AppText variant="small" color={colors.textMuted}>
              Bank + KYC details for settlements. You can add these now or later — they’re required before payouts.
            </AppText>
            <Field label="Legal / business name" value={legalName} onChangeText={setLegalName} placeholder="Iron Paradise Pvt Ltd" />
            <View style={styles.row2}>
              <Field style={{ flex: 1 }} label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters" />
              <Field style={{ flex: 1 }} label="GSTIN" value={gstin} onChangeText={setGstin} autoCapitalize="characters" />
            </View>
            <Field label="Bank account name" value={bankName} onChangeText={setBankName} />
            <Field label="Account number" value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" />
            <Field label="IFSC" value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: spacing.md }}>
            <Card style={{ gap: spacing.sm }}>
              <Row label="Gym" value={name} />
              <Row label="Where" value={`${area}, ${city}`} />
              <Row label="Hours" value={timings} />
              <Row label="Amenities" value={amenities.join(', ') || '—'} />
              <Row label="Slots" value={`${slots.filter((s) => s.time.trim()).length} configured`} />
              <Row label="KYC" value={legalName || bankAccount ? 'Provided' : 'Add later'} />
            </Card>
            <View style={styles.noteRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <AppText variant="small" color={colors.textMuted} style={{ flex: 1 }}>
                Your gym goes live after our team verifies it. You’ll get a notification the moment it’s approved.
              </AppText>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step < STEPS.length - 1
          ? <Button title="Continue" icon="arrow-forward" onPress={next} fullWidth />
          : <Button title="Submit for review" icon="checkmark-circle" loading={submitting} onPress={submit} fullWidth />}
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="small" color={colors.textSubtle}>{label}</AppText>
      <AppText variant="smallStrong" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{value || '—'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSubtle },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  steps: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.surfaceSunken, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  stepLabel: { textAlign: 'center', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  slotHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  noteRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.primaryTint, padding: spacing.md, borderRadius: radius.md },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
