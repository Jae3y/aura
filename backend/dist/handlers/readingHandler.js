"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReading = handleReading;
const sensor_readings_1 = require("../lib/db/sensor_readings");
const alerta_1 = require("../services/alerta");
const socket_1 = require("../socket");
const events_1 = require("../socket/events");
// Voltage bounds that flag an out-of-range reading regardless of the
// device-level anomaly flag (failsafe for Req 1.2 / 5.1).
const VOLTAGE_MIN = 170;
const VOLTAGE_MAX = 260;
function isAnomalous(payload) {
    if (payload.is_anomaly)
        return true;
    if (payload.voltage !== undefined &&
        (payload.voltage < VOLTAGE_MIN || payload.voltage > VOLTAGE_MAX)) {
        return true;
    }
    if (payload.anomaly_score !== undefined && payload.anomaly_score > 0.75) {
        return true;
    }
    return false;
}
async function handleReading(device, payload) {
    const anomalous = isAnomalous(payload);
    // 1. Persist reading row.
    const reading = await (0, sensor_readings_1.insertReading)({
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
    (0, socket_1.emitToDevice)(device.id, events_1.SOCKET_EVENTS.READING_NEW, {
        deviceId: device.id,
        reading,
    });
    // 3. Non-critical anomaly → informational Alerta alert only (no push).
    if (anomalous) {
        await (0, alerta_1.sendAlert)((0, alerta_1.buildAnomalyPayload)(reading, device));
    }
}
//# sourceMappingURL=readingHandler.js.map