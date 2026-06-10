import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors, fonts } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName, nameFocused: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? nameFocused : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.extrabold, fontSize: 19 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', headerShown: false, tabBarIcon: tabIcon('search-outline', 'search') }} />
      <Tabs.Screen name="events" options={{ title: 'Events', headerTitle: 'Events near you', tabBarIcon: tabIcon('flash-outline', 'flash') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', headerTitle: 'My bookings', tabBarIcon: tabIcon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', headerTitle: 'Wallet & credits', tabBarIcon: tabIcon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false, tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
