import axios, { AxiosInstance } from 'axios';
import * as Sentry from '@sentry/node';
import { config } from '../config';
import type { Device, ThreatEvent, Zone, SensorReading, Severity } from '../types/database';

// ---------------------------------------------------------------------------
// Encrisoft Alerta v2 — notification routing service.
// Auth: x-api-key + x-api-secret on every request.
// This service sends Telegram notifications when AURA detects threats,
// anomalies, or device offline events. There is no alert lifecycle
// (no ack/close/status) — Alerta is a one-way notification channel.
// ---------------------------------------------------------------------------

export interface AlertaNotification {
  channelRef: string;
  title: string;
  message: string;
  severity: string;
}

export interface AlertaResult {
  success: boolean;
  requestRef?: string;
  messageId?: string;
  sentAt?: string;
  balance?: number;
}

// AURA severity → Alerta severity label. Exhaustive (Property 7).
export function mapSeverity(severity: Severity | 'anomaly' | 'offline'): string {
  switch (severity) {
    case 'critical': return 'Critical';
    case 'high':     return 'High';
    case 'medium':   return 'Medium';
    case 'low':      return 'Low';
    case 'anomaly':  return 'Info';
    case 'offline':  return 'High';
    default:         return 'Medium';
  }
}

let http: AxiosInstance | null = null;
function client(): AxiosInstance {
  if (!http) {
    http = axios.create({
      baseURL: config.ALERTA_BASE_URL,
      headers: {
        'x-api-key': config.ALERTA_API_KEY,
        'x-api-secret': config.ALERTA_API_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }
  return http;
}

// ---------------------------------------------------------------------------
// Retry queue — failed sendAlert calls retry with exponential back-off for up
// to 5 minutes; on final failure exactly one Sentry error is captured.
// ---------------------------------------------------------------------------
const MAX_RETRY_WINDOW_MS = 5 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postNotification(notification: AlertaNotification): Promise<AlertaResult> {
  const res = await client().post('/telegram/send', notification);
  return res.data as AlertaResult;
}

export async function sendAlert(notification: AlertaNotification): Promise<AlertaResult | null> {
  const start = Date.now();
  let delay = 1000;
  let lastError: unknown;

  while (Date.now() - start < MAX_RETRY_WINDOW_MS) {
    try {
      return await postNotification(notification);
    } catch (err) {
      lastError = err;
      if (Date.now() - start + delay >= MAX_RETRY_WINDOW_MS) break;
      await sleep(delay);
      delay = Math.min(delay * 2, 60000);
    }
  }

  Sentry.captureException(lastError, {
    tags: { subsystem: 'alerta' },
    extra: { title: notification.title },
  });
  return null;
}

// ---------------------------------------------------------------------------
// Payload builders — one per event type
// ---------------------------------------------------------------------------
function locationOf(device: Device): string {
  return device.location_label ?? 'Unknown Location';
}

export function buildSurgePayload(
  event: ThreatEvent,
  device: Device
): AlertaNotification {
  const voltage = event.voltage_at_event ?? '?';
  const current = event.current_at_event ?? '?';
  return {
    channelRef: config.ALERTA_CHANNEL_REF,
    title: `⚡ Surge Detected — ${device.name}`,
    message:
      `Device: ${device.name}\n` +
      `Location: ${locationOf(device)}\n` +
      `Voltage: ${voltage}V | Current: ${current}A\n` +
      `Severity: ${event.severity.toUpperCase()}\n` +
      `Relay triggered: CH${event.relay_channel ?? 1}\n` +
      `Event ID: ${event.id}`,
    severity: mapSeverity(event.severity),
  };
}

export function buildIntrusionPayload(
  event: ThreatEvent,
  zone: Zone,
  device: Device
): AlertaNotification {
  return {
    channelRef: config.ALERTA_CHANNEL_REF,
    title: `🚨 Intrusion Detected — ${device.name}`,
    message:
      `Device: ${device.name}\n` +
      `Location: ${locationOf(device)}\n` +
      `Zone: ${zone.name} (${zone.zone_type})\n` +
      `Severity: ${event.severity.toUpperCase()}\n` +
      `Event ID: ${event.id}`,
    severity: mapSeverity(event.severity),
  };
}

export function buildOfflinePayload(device: Device): AlertaNotification {
  return {
    channelRef: config.ALERTA_CHANNEL_REF,
    title: `📴 Device Offline — ${device.name}`,
    message:
      `Device: ${device.name}\n` +
      `Location: ${locationOf(device)}\n` +
      `Status: OFFLINE\n` +
      `Last seen: ${device.last_seen ?? 'Unknown'}`,
    severity: mapSeverity('offline'),
  };
}

export function buildAnomalyPayload(
  reading: SensorReading,
  device: Device
): AlertaNotification {
  return {
    channelRef: config.ALERTA_CHANNEL_REF,
    title: `⚠️ Sensor Anomaly — ${device.name}`,
    message:
      `Device: ${device.name}\n` +
      `Location: ${locationOf(device)}\n` +
      `Voltage: ${reading.voltage}V | Current: ${reading.current_amps}A\n` +
      `Anomaly score: ${reading.anomaly_score ?? '?'}\n` +
      `Reading ID: ${reading.id}`,
    severity: mapSeverity('anomaly'),
  };
}
