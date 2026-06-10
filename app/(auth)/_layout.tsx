import { Stack } from 'expo-router';
import { colors, fonts } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold, color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: '' }} />
      <Stack.Screen name="sign-up" options={{ title: '' }} />
    </Stack>
  );
}
