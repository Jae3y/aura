import { config } from '../config';
import { sendPush } from './fcm';
import { sendThreatAlert } from './email';
import type { Profile, ThreatEvent, Device } from '../types/database';

function isCritical(severity: string): boolean {
  return severity === 'critical' || severity === 'high';
}

// Sends a threat notification with FCM → Resend fallback.
// Fallback email is dispatched ONLY for critical/high severity FCM failures
// (Property 9), and only when the respective channel flag is enabled.
export async function notifyThreat(
  profile: Profile,
  event: ThreatEvent,
  device: Device
): Promise<{ pushDelivered: boolean; emailDelivered: boolean }> {
  const deepLink = `${config.FRONTEND_URL}/threats?event=${event.id}`;

  let pushDelivered = false;
  if (profile.notification_push && profile.fcm_token) {
    pushDelivered = await sendPush(profile.fcm_token, {
      title: `AURA ${event.event_type} (${event.severity})`,
      body: `${device.name}: ${event.action_taken ?? event.event_type}`,
      solanaSig: event.solana_signature,
      deepLink,
    });
  }

  let emailDelivered = false;
  if (
    !pushDelivered &&
    isCritical(event.severity) &&
    profile.notification_email &&
    profile.email
  ) {
    emailDelivered = await sendThreatAlert(profile.email, event, device);
  }

  return { pushDelivered, emailDelivered };
}

// Push notification when a device goes offline (Req 12.3).
export async function notifyOffline(
  profile: Profile,
  device: Device
): Promise<boolean> {
  if (!profile.notification_push || !profile.fcm_token) return false;
  return sendPush(profile.fcm_token, {
    title: 'AURA device offline',
    body: `${device.name} stopped responding`,
    solanaSig: null,
    deepLink: `${config.FRONTEND_URL}/devices/${device.id}`,
  });
}
