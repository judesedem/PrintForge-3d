// PrintForge 3D — usePushNotifications hook
// Sets up expo-notifications: requests permission, gets the Expo push token,
// registers it with the Spring Boot backend, and sets up foreground handlers.
//
// Usage: call usePushNotifications() once inside AuthProvider after login.

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRegisterPushToken } from '../services/api';

// Show notifications as banners even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Returns the Expo push token (or null on simulators / web).
 * Handles Android notification channel creation automatically.
 */
async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[PushNotif] Must use a physical device for push notifications.');
    return null;
  }

  // Android: create a default channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'PrintForge 3D',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D2FF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PushNotif] Permission not granted.');
    return null;
  }

  // Project ID comes from app.json → expo.extra.eas.projectId (set via `eas init`).
  // Constants.expoConfig is populated at build/runtime by Expo from app.json.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId || projectId === 'REPLACE_WITH_YOUR_EAS_PROJECT_ID') {
    console.warn(
      '[PushNotif] No valid EAS project ID found in app.json (expo.extra.eas.projectId). ' +
      'Run `eas init` and set the real project ID, or push notifications will not register.'
    );
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  return tokenData.data;
}

interface UsePushNotificationsOptions {
  /** Called when user taps a notification */
  onNotificationTapped?: (notification: Notifications.Notification) => void;
  /** Called when a notification arrives while app is open */
  onNotificationReceived?: (notification: Notifications.Notification) => void;
}

export function usePushNotifications({
  onNotificationTapped,
  onNotificationReceived,
}: UsePushNotificationsOptions = {}) {
  const notifListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register and send token to backend
    registerForPushNotifications().then(async token => {
      if (token) {
        try {
          await apiRegisterPushToken(token);
          console.log('[PushNotif] Token registered:', token);
        } catch (e) {
          console.warn('[PushNotif] Failed to register token with server:', e);
        }
      }
    });

    // Foreground notification handler
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      onNotificationReceived?.(notification);
    });

    // User tapped notification (foreground or background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      onNotificationTapped?.(response.notification);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
