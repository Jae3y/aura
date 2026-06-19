"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMonthlyStats = computeMonthlyStats;
const supabase_1 = require("../lib/supabase");
function monthRange(month) {
    const from = new Date(`${month}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
}
// Aggregates threat_events and sensor_readings for a device + month. All
// counts are derived directly from the source tables (Property 10).
async function computeMonthlyStats(deviceId, month) {
    const { from, to } = monthRange(month);
    const { data: threatsRaw, error: tErr } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .select('*')
        .eq('device_id', deviceId)
        .gte('occurred_at', from)
        .lt('occurred_at', to);
    if (tErr)
        throw tErr;
    const threats = (threatsRaw ?? []);
    const { data: readingsRaw, error: rErr } = await supabase_1.supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .eq('device_id', deviceId)
        .gte('recorded_at', from)
        .lt('recorded_at', to);
    if (rErr)
        throw rErr;
    const readings = (readingsRaw ?? []);
    const surges = threats.filter((t) => t.event_type === 'surge').length;
    const intrusions = threats.filter((t) => t.event_type === 'intrusion').length;
    const relayActivations = threats.filter((t) => t.relay_triggered).length;
    const solanaLogged = threats.filter((t) => t.solana_confirmed).length;
    const alertaAlerts = threats.filter((t) => t.alerta_alert_id).length;
    const alertaResolved = threats.filter((t) => t.alerta_status === 'ack' || t.alerta_status === 'closed').length;
    const voltages = readings.map((r) => r.voltage).filter((v) => !Number.isNaN(v));
    const anomalies = readings.filter((r) => r.is_anomaly).length;
    const avg = voltages.length > 0
        ? voltages.reduce((a, b) => a + b, 0) / voltages.length
        : null;
    // Approximate uptime: readings are expected every 2s. Cap ratio at 1.
    const expectedReadings = (30 * 24 * 3600) / 2;
    const uptimeRatio = Math.min(1, readings.length / expectedReadings);
    return {
        total_threats: threats.length,
        surges_blocked: surges,
        intrusions_detected: intrusions,
        relay_activations: relayActivations,
        total_anomalies: anomalies,
        total_readings: readings.length,
        avg_voltage: avg,
        min_voltage: voltages.length ? Math.min(...voltages) : null,
        max_voltage: voltages.length ? Math.max(...voltages) : null,
        solana_events_logged: solanaLogged,
        alerta_alerts_count: alertaAlerts,
        alerta_ack_rate: alertaAlerts > 0 ? alertaResolved / alertaAlerts : 0,
        uptime_ratio: uptimeRatio,
    };
}
//# sourceMappingURL=reportStats.js.map