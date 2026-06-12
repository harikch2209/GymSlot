// Best-effort Expo push registration. Push is a `needs-creds`/native-build
// concern (PRD 6.6) — this no-ops on web, simulators, in Expo Go where remote
// push isn't available, or when the user denies permission. In-app
// notifications work regardless; a registered token just lets the
// send-notification Edge Function reach the device when delivery is enabled.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken, unregisterPushToken } from '@/lib/api';

// Show a banner for notifications that arrive while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// The Expo token is per-install (independent of the signed-in user), so we
// cache it once. `registeredFor` tracks which user the token is currently bound
// to server-side, so an account switch on the same runtime re-binds correctly.
let deviceToken: string | null = null;
let registeredFor: string | null = null;

/**
 * Bind this device's push token to `userId` (idempotent per user). Re-binds when
 * a different user signs in on the same runtime, so the token never stays mapped
 * to the previous account.
 */
export async function registerForPush(userId: string): Promise<void> {
  if (!userId || registeredFor === userId) return;
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (!deviceToken) {
      let status = (await Notifications.getPermissionsAsync()).status;
      if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
      }
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      deviceToken = data ?? null;
    }

    if (deviceToken) {
      await registerPushToken(deviceToken, Platform.OS);
      registeredFor = userId;
    }
  } catch {
    // Best-effort: never let push setup break app startup or account switch.
  }
}

/**
 * Unbind this device's token from the current user (call while still
 * authenticated, e.g. before sign-out) so the next user re-registers cleanly and
 * no pushes route to the signed-out account.
 */
export async function unregisterForPush(): Promise<void> {
  const token = deviceToken;
  registeredFor = null; // force re-registration for whoever signs in next
  if (!token) return;
  try {
    await unregisterPushToken(token);
  } catch {
    /* ignore — best-effort */
  }
}
