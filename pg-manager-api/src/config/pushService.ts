import logger from '../utils/logger.js';

// ─── Expo Push Notifications ────────────────────────────────────────
// Uses the Expo Push API directly via fetch (no SDK dependency needed).
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  to: string; // ExpoPushToken
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface PushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Send a single push notification via Expo Push API.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    logger.warn({ expoPushToken }, '[Push] Invalid or missing push token, skipping');
    return false;
  }

  try {
    const message: PushMessage = {
      to: expoPushToken,
      title,
      body,
      data,
      sound: 'default',
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const json = await res.json() as { data: PushTicket };

    if (json.data?.status === 'error') {
      logger.error(
        { error: json.data.details?.error, message: json.data.message },
        '[Push] Failed to send notification',
      );
      return false;
    }

    logger.info({ ticketId: json.data?.id }, '[Push] Notification sent');
    return true;
  } catch (err) {
    logger.error({ err }, '[Push] Error sending notification');
    return false;
  }
}

/**
 * Send push notifications to multiple tokens in chunks of 100.
 */
export async function sendPushNotificationBatch(
  messages: PushMessage[],
): Promise<{ sent: number; failed: number }> {
  const CHUNK_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const json = await res.json() as { data: PushTicket[] };

      for (const ticket of json.data) {
        if (ticket.status === 'ok') sent++;
        else failed++;
      }
    } catch (err) {
      logger.error({ err, chunkIndex: i }, '[Push] Batch send failed');
      failed += chunk.length;
    }
  }

  logger.info({ sent, failed }, '[Push] Batch send complete');
  return { sent, failed };
}
