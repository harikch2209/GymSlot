import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
import { NotificationsProvider } from '@/context/NotificationsContext';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgSubtle },
} as const;

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Redirects between the auth flow and the app depending on session state. */
function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/welcome');
    else if (session && inAuthGroup) router.replace('/(tabs)');
  }, [session, initializing, segments]);

  // Don't render protected routes until we know the session.
  if (initializing) return <Loading />;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="map" options={{ headerShown: false }} />
      <Stack.Screen name="partner/index" options={{ headerShown: false }} />
      <Stack.Screen name="partner/register" options={{ headerShown: false }} />
      <Stack.Screen name="partner/gym/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="partner/event-new" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="partner/scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="gym/[id]" options={{ headerTransparent: true, headerTitle: '' }} />
      <Stack.Screen name="book/[id]" options={{ title: 'Book a slot' }} />
      <Stack.Screen name="event/[id]" options={{ headerTransparent: true, headerTitle: '' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      <Stack.Screen name="ticket/[id]" options={{ title: 'Your booking', headerBackVisible: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="notification-prefs" options={{ title: 'Notification settings' }} />
      <Stack.Screen name="help" options={{ title: 'Help & support' }} />
      <Stack.Screen name="report" options={{ title: 'Report a problem', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  const [ready, setReady] = useState(false);

  // Proceed as soon as fonts resolve (loaded OR errored). A safety timeout
  // guarantees we never hang on the splash screen if font loading stalls —
  // text just falls back to the system font.
  useEffect(() => {
    if (fontsLoaded || fontError) setReady(true);
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <AppProvider>
            <NotificationsProvider>
              <RootNavigator />
            </NotificationsProvider>
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
