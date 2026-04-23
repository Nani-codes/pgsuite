import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { api } from '../services/api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure how notifications are handled when the app is in the foreground
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.error('[Push] Failed to load expo-notifications', e);
  }
}

/**
 * Custom hook for managing Expo Push Notifications.
 * - Requests permission and gets the ExpoPushToken
 * - Registers the token with the API backend
 * - Listens for incoming and tapped notifications
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || isExpoGo || !Notifications) return;

    // Register for push notifications
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        // Send token to our API
        try {
          await api.notifications.registerToken(token);
        } catch {
          // Silently fail — we'll retry on next app launch
        }
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notif: any) => {
        setNotification(notif);
      },
    );

    // Listen for notification taps (background/killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response: any) => {
        // Could navigate based on notification data
        // const data = response.notification.request.content.data;
      },
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);

  return { expoPushToken, notification };
}

/**
 * Request push notification permissions and get the Expo push token.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications (remote) do not work in Expo Go on SDK 53+
  if (isExpoGo || !Notifications) {
    console.log('[Push] Skipping registration in Expo Go (not supported in SDK 53+)');
    return null;
  }

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '5b73bf75-7af4-4a4d-8525-04808ffc3b36',
    });
    const token = tokenData.data;
    console.log('[Push] Token:', token);

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PG Manager',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a56db',
      });
    }

    return token;
  } catch (err) {
    console.error('[Push] Failed to get token:', err);
    return null;
  }
}
