import type { Device } from '../types/database';
import { insertReading } from '../lib/db/sensor_readings';
import { buildAnomalyPayload, sendAlert } from '../services/alerta';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

interface ReadingPayload {
  voltage?: number;
  current_amps?: number;
  frequency?: number;
  power_factor?: number;
  anomaly_score?: number;
  is_anomaly?: boolean;
}

// Voltage bounds that flag an out-of-range reading regardless of the
// device-level anomaly flag (failsafe for Req 1.2 / 5.1).
const VOLTAGE_MIN = 170;
const VOLTAGE_MAX = 260;

function isAnomalous(payload: ReadingPayload): boolean {
  if (payload.is_anomaly) return true;
  if (
    payload.voltage !== undefined &&
    (payload.voltage < VOLTAGE_MIN || payload.voltage > VOLTAGE_MAX)
  ) {
    return true;
  }
  if (payload.anomaly_score !== undefined && payload.anomaly_score > 0.75) {
    return true;
  }
  return false;
}

export async function handleReading(
  device: Device,
  payload: ReadingPayload
): Promise<void> {
  const anomalous = isAnomalous(payload);

  // 1. Persist reading row.
  const reading = await insertReading({
    device_id: device.id,
    voltage: payload.voltage ?? 0,
    current_amps: payload.current_amps ?? 0,
    frequency: payload.frequency ?? 0,
    power_factor: payload.power_factor ?? 0,
    power_watts: 0,
    energy_kwh: 0,
    anomaly_score: payload.anomaly_score ?? null,
    is_anomaly: anomalous,
  });

  // 2. Emit reading:new so dashboard updates in real-time.
  emitToDevice(device.id, SOCKET_EVENTS.READING_NEW, {
    deviceId: device.id,
    reading,
  });

  // 3. Non-critical anomaly → informational Alerta alert only (no push).
  if (anomalous) {
    await sendAlert(buildAnomalyPayload(reading, device));
  }
}
