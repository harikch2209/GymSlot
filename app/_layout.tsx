import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgSubtle },
} as const;

/** Redirects between the auth flow and the app depending on session state. */
function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    SplashScreen.hideAsync().catch(() => {});
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/welcome');
    else if (session && inAuthGroup) router.replace('/(tabs)');
  }, [session, initializing, segments]);

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="gym/[id]" options={{ headerTransparent: true, headerTitle: '' }} />
      <Stack.Screen name="book/[id]" options={{ title: 'Book a slot' }} />
      <Stack.Screen name="event/[id]" options={{ headerTransparent: true, headerTitle: '' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      <Stack.Screen name="ticket/[id]" options={{ title: 'Your booking', headerBackVisible: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <AppProvider>
            <RootNavigator />
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
