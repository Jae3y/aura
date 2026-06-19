import mqtt, { MqttClient } from 'mqtt';
import * as Sentry from '@sentry/node';
import { config } from '../config';
import { getDeviceByToken } from '../lib/db/devices';
import type { Device } from '../types/database';
import { handleSurge } from '../handlers/surgeHandler';
import { handlePresence } from '../handlers/presenceHandler';
import { handleReading } from '../handlers/readingHandler';
import { handleVoice } from '../handlers/voiceHandler';
import { handleHeartbeat } from '../handlers/heartbeatHandler';

let client: MqttClient | null = null;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 60000];
let reconnectAttempt = 0;

export interface DeviceCommand {
  command: string;
  channel?: number;
  requestedBy: string;
  solanaSignature?: string;
}

export async function validateDeviceToken(
  deviceId: string,
  token: string
): Promise<Device | null> {
  if (!token) return null;
  return getDeviceByToken(deviceId, token);
}

// Routes a validated message to its handler based on the topic suffix.
async function route(suffix: string, device: Device, payload: any): Promise<void> {
  switch (suffix) {
    case 'readings':
      await handleReading(device, payload);
      break;
    case 'surge':
      await handleSurge(device, payload);
      break;
    case 'presence':
      await handlePresence(device, payload);
      break;
    case 'voice':
      await handleVoice(device, payload);
      break;
    case 'heartbeat':
    case 'status':
      await handleHeartbeat(device, payload);
      break;
    default:
      break;
  }
}

// Every inbound message is validated against device_token before any handler
// runs. A token mismatch silently drops the message (Property 4).
export async function onMessage(topic: string, message: Buffer): Promise<void> {
  try {
    const parts = topic.split('/'); // aura/{deviceId}/{suffix}
    if (parts.length < 3 || parts[0] !== 'aura') return;
    const deviceId = parts[1];
    const suffix = parts.slice(2).join('/');

    let payload: any;
    try {
      payload = JSON.parse(message.toString());
    } catch {
      return;
    }

    const token = payload?.device_token ?? payload?.deviceToken;
    const device = await validateDeviceToken(deviceId, token);
    if (!device) return; // silent drop

    await route(suffix, device, payload);
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: 'mqtt' } });
  }
}

export function publishCommand(
  deviceId: string,
  command: DeviceCommand
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      reject(new Error('MQTT client not connected'));
      return;
    }
    const payload = JSON.stringify({ ...command, timestamp: Date.now() });
    client.publish(
      `aura/${deviceId}/cmd`,
      payload,
      { qos: 1 },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function handleDisconnect(): void {
  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  reconnectAttempt += 1;
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log(`MQTT reconnecting (attempt ${reconnectAttempt})...`);
    client?.reconnect();
  }, delay);
}

export function connectMQTT(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    client = mqtt.connect(config.HIVEMQ_URL, {
      username: config.HIVEMQ_USER,
      password: config.HIVEMQ_PASS,
      protocolVersion: 5,
      reconnectPeriod: 0, // manual back-off via handleDisconnect
    });

    client.on('connect', () => {
      reconnectAttempt = 0;
      client!.subscribe('aura/+/#', { qos: 1 });
      // eslint-disable-next-line no-console
      console.log('📡 MQTT connected to HiveMQ');
      resolve(client!);
    });

    client.on('message', (topic, message) => void onMessage(topic, message));
    client.on('error', (err) => {
      Sentry.captureException(err, { tags: { subsystem: 'mqtt' } });
      reject(err);
    });
    client.on('close', handleDisconnect);
  });
}

export function getMqttClient(): MqttClient | null {
  return client;
}
