"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertEvent = insertEvent;
exports.getEventsByDevice = getEventsByDevice;
exports.getEventById = getEventById;
exports.updateSolanaSignature = updateSolanaSignature;
exports.setSolanaUnconfirmed = setSolanaUnconfirmed;
exports.updateAlertaStatus = updateAlertaStatus;
exports.findByAlertaId = findByAlertaId;
const supabase_1 = require("../supabase");
async function insertEvent(event) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .insert(event)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getEventsByDevice(deviceId, limit = 100) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .select('*')
        .eq('device_id', deviceId)
        .order('occurred_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function getEventById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function updateSolanaSignature(id, sig, slot) {
    const { error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .update({ solana_signature: sig, solana_slot: slot, solana_confirmed: true })
        .eq('id', id);
    if (error)
        throw error;
}
async function setSolanaUnconfirmed(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .update({ solana_confirmed: false })
        .eq('id', id);
    if (error)
        throw error;
}
async function updateAlertaStatus(id, alertId, status) {
    const { error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .update({ alerta_alert_id: alertId, alerta_status: status })
        .eq('id', id);
    if (error)
        throw error;
}
async function findByAlertaId(alertaAlertId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('threat_events')
        .select('*')
        .eq('alerta_alert_id', alertaAlertId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
//# sourceMappingURL=threat_events.js.map