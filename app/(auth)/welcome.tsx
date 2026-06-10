import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, type as T } from '@/theme';
import { AppText, Button, Ionicons } from '@/components/ui';

const HERO = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image source={{ uri: HERO }} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(14,17,22,0.25)', 'rgba(14,17,22,0.55)', 'rgba(14,17,22,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="barbell" size={20} color={colors.ink} />
          </View>
          <AppText variant="h3" color="#fff">GymSlot</AppText>
        </View>

        <View style={{ flex: 1 }} />

        <AppText variant="display" color="#fff" style={{ fontSize: 38, lineHeight: 44 }}>
          Pay per slot.{'\n'}Never per month.
        </AppText>
        <AppText variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: spacing.md, fontSize: 16, lineHeight: 24 }}>
          Book a 30 or 60-minute session at gyms near you. See live crowd levels, add a trainer, and only pay for what you actually use.
        </AppText>

        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Button title="Create account" icon="arrow-forward" onPress={() => router.push('/(auth)/sign-up')} fullWidth />
          <Button title="I already have an account" variant="ghost" onPress={() => router.push('/(auth)/sign-in')} fullWidth
            fg="#fff" style={{ borderColor: 'rgba(255,255,255,0.4)' }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
