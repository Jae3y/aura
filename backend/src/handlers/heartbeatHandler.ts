import * as Sentry from '@sentry/node';
import type { Device } from '../types/database';
import { updateLastSeen, updateDeviceStatus } from '../lib/db/devices';
import { getOwnerProfileForDevice } from '../lib/db/profiles';
import { buildOfflinePayload, sendAlert } from '../services/alerta';
import { notifyOffline } from '../services/notify';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

// Per-device watchdog timers: deviceId → NodeJS.Timeout
const watchdogs = new Map<string, ReturnType<typeof setTimeout>>();

// If no heartbeat arrives within this window the device is declared offline.
const OFFLINE_TIMEOUT_MS = 90_000; // 90 s

async function declareOffline(device: Device): Promise<void> {
  try {
    await updateDeviceStatus(device.id, false);
    emitToDevice(device.id, SOCKET_EVENTS.DEVICE_OFFLINE, {
      deviceId: device.id,
    });

    // Submit Alerta major alert.
    await sendAlert(buildOfflinePayload(device));

    // FCM push to owner.
    const owner = await getOwnerProfileForDevice(device.id);
    if (owner) await notifyOffline(owner, device);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { subsystem: 'heartbeat-offline' },
      extra: { deviceId: device.id },
    });
  }
}

function resetWatchdog(device: Device): void {
  const existing = watchdogs.get(device.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    watchdogs.delete(device.id);
    void declareOffline(device);
  }, OFFLINE_TIMEOUT_MS);

  // Allow Node.js to exit even if timer is pending (integration-test friendliness).
  if (typeof timer === 'object' && 'unref' in timer) {
    (timer as ReturnType<typeof setTimeout> & { unref(): void }).unref();
  }

  watchdogs.set(device.id, timer);
}

export async function handleHeartbeat(
  device: Device,
  _payload: unknown
): Promise<void> {
  // 1. Update last_seen + is_online flag.
  await updateLastSeen(device.id);

  // 2. Re-arm watchdog — any heartbeat resets the 90 s timer.
  resetWatchdog(device);

  // 3. Emit device:online so the dashboard reflects live status.
  emitToDevice(device.id, SOCKET_EVENTS.DEVICE_ONLINE, {
    deviceId: device.id,
    lastSeen: new Date().toISOString(),
  });
}

// Exported for testing.
export function clearWatchdog(deviceId: string): void {
  const t = watchdogs.get(deviceId);
  if (t) {
    clearTimeout(t);
    watchdogs.delete(deviceId);
  }
}
