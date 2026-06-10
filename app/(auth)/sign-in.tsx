import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/theme';
import { AppText, Button, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // RootNavigator redirects on the resulting session change.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h1">Welcome back</AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: 6 }}>
          Sign in to find your next slot.
        </AppText>

        <View style={styles.form}>
          <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="emailAddress" />
          <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword}
            placeholder="Your password" secureTextEntry autoCapitalize="none"
            textContentType="password" error={error} />
          <Button title="Sign in" loading={loading} onPress={submit} fullWidth style={{ marginTop: spacing.sm }} />
        </View>

        <View style={styles.footer}>
          <AppText variant="small" color={colors.textMuted}>New to GymSlot? </AppText>
          <Button title="Create an account" variant="ghost" size="sm" onPress={() => router.replace('/(auth)/sign-up')}
            style={{ borderWidth: 0, paddingHorizontal: 4 }} fg={colors.primary} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, flexGrow: 1 },
  form: { gap: spacing.md, marginTop: spacing.xl },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
});
