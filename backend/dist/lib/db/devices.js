"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDevice = createDevice;
exports.updateDevice = updateDevice;
exports.deleteDevice = deleteDevice;
exports.getDevices = getDevices;
exports.getDeviceById = getDeviceById;
exports.getDeviceByToken = getDeviceByToken;
exports.updateDeviceStatus = updateDeviceStatus;
exports.updateLastSeen = updateLastSeen;
exports.updateNftMintAddress = updateNftMintAddress;
const supabase_1 = require("../supabase");
async function createDevice(device) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .insert(device)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateDevice(id, patch) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteDevice(id) {
    const { error } = await supabase_1.supabaseAdmin.from('devices').delete().eq('id', id);
    if (error)
        throw error;
}
async function getDevices(userId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function getDeviceById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function getDeviceByToken(id, token) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .select('*')
        .eq('id', id)
        .eq('device_token', token)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function updateDeviceStatus(id, isOnline) {
    const { error } = await supabase_1.supabaseAdmin
        .from('devices')
        .update({ is_online: isOnline })
        .eq('id', id);
    if (error)
        throw error;
}
async function updateLastSeen(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('devices')
        .update({ last_seen: new Date().toISOString(), is_online: true })
        .eq('id', id);
    if (error)
        throw error;
}
async function updateNftMintAddress(id, mintAddress) {
    const { error } = await supabase_1.supabaseAdmin
        .from('devices')
        .update({ nft_mint_address: mintAddress })
        .eq('id', id);
    if (error)
        throw error;
}
//# sourceMappingURL=devices.js.map