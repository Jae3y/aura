import admin from 'firebase-admin';
import * as Sentry from '@sentry/node';
import { config } from '../config';

let app: admin.app.App | null = null;

function getApp(): admin.app.App | null {
  if (app) return app;
  if (!config.FCM_CLIENT_EMAIL || !config.FCM_PRIVATE_KEY) return null;
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FCM_PROJECT_ID,
      clientEmail: config.FCM_CLIENT_EMAIL,
      privateKey: config.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  return app;
}

export interface PushPayload {
  title: string;
  body: string;
  solanaSig: string | null;
  deepLink: string;
}

function buildMessage(payload: PushPayload) {
  return {
    notification: { title: payload.title, body: payload.body },
    data: {
      solanaSig: payload.solanaSig ?? '',
      url: payload.deepLink,
    },
  };
}

// Returns true on successful delivery, false on failure (caller decides on
// fallback). Never throws.
export async function sendPush(
  token: string,
  payload: PushPayload
): Promise<boolean> {
  const a = getApp();
  if (!a || !token) return false;
  try {
    await admin.messaging(a).send({ token, ...buildMessage(payload) });
    return true;
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'fcm' } });
    return false;
  }
}

export async function sendBulkPush(
  tokens: string[],
  payload: PushPayload
): Promise<boolean> {
  const a = getApp();
  const valid = tokens.filter(Boolean);
  if (!a || valid.length === 0) return false;
  try {
    const res = await admin
      .messaging(a)
      .sendEachForMulticast({ tokens: valid, ...buildMessage(payload) });
    return res.successCount > 0;
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'fcm' } });
    return false;
  }
}
