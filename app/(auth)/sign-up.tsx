import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/theme';
import { AppText, Button, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Tell us your name.');
    if (!email.trim()) return setError('Enter your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, password, name);
      if (needsConfirmation) {
        Alert.alert(
          'Confirm your email',
          'We sent you a confirmation link. Tap it, then sign in.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
        );
      }
      // Otherwise RootNavigator redirects into the app on the new session.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h1">Create your account</AppText>
        <AppText variant="body" color={colors.textMuted} style={{ marginTop: 6 }}>
          Get ₹250 in welcome credits to try your first session.
        </AppText>

        <View style={styles.form}>
          <Field label="Full name" icon="person-outline" value={name} onChangeText={setName}
            placeholder="Hari Krishna" autoCapitalize="words" textContentType="name" />
          <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="emailAddress" />
          <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword}
            placeholder="At least 6 characters" secureTextEntry autoCapitalize="none"
            textContentType="newPassword" error={error} />
          <Button title="Create account" loading={loading} onPress={submit} fullWidth style={{ marginTop: spacing.sm }} />
          <AppText variant="small" color={colors.textSubtle} style={{ textAlign: 'center', marginTop: 4 }}>
            By continuing you agree to our Terms and Privacy Policy.
          </AppText>
        </View>

        <View style={styles.footer}>
          <AppText variant="small" color={colors.textMuted}>Already have an account? </AppText>
          <Button title="Sign in" variant="ghost" size="sm" onPress={() => router.replace('/(auth)/sign-in')}
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
