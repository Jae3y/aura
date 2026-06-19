"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZonesByDevice = getZonesByDevice;
exports.getZoneById = getZoneById;
exports.createZone = createZone;
exports.updateZone = updateZone;
exports.deleteZone = deleteZone;
exports.setPresence = setPresence;
const supabase_1 = require("../supabase");
async function getZonesByDevice(deviceId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('zones')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
async function getZoneById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('zones')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function createZone(zone) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('zones')
        .insert(zone)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateZone(id, patch) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('zones')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteZone(id) {
    const { error } = await supabase_1.supabaseAdmin.from('zones').delete().eq('id', id);
    if (error)
        throw error;
}
async function setPresence(id, detected) {
    const { error } = await supabase_1.supabaseAdmin
        .from('zones')
        .update({
        presence_detected: detected,
        last_presence_at: detected ? new Date().toISOString() : undefined,
    })
        .eq('id', id);
    if (error)
        throw error;
}
//# sourceMappingURL=zones.js.map