import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/AppContext';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="gym/[id]" options={{ title: '' , headerTransparent: true }} />
          <Stack.Screen name="book/[id]" options={{ title: 'Book a slot' }} />
          <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="ticket/[id]" options={{ title: 'Your booking' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
