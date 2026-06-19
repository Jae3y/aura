"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileById = getProfileById;
exports.upsertProfile = upsertProfile;
exports.updateWalletAddress = updateWalletAddress;
exports.updateFcmToken = updateFcmToken;
exports.getOwnerProfileForDevice = getOwnerProfileForDevice;
const supabase_1 = require("../supabase");
async function getProfileById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function upsertProfile(profile) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateWalletAddress(id, walletAddress) {
    const { error } = await supabase_1.supabaseAdmin
        .from('profiles')
        .update({ wallet_address: walletAddress })
        .eq('id', id);
    if (error)
        throw error;
}
async function updateFcmToken(id, token) {
    const { error } = await supabase_1.supabaseAdmin
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', id);
    if (error)
        throw error;
}
async function getOwnerProfileForDevice(deviceId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('devices')
        .select('user_id, profiles!inner(*)')
        .eq('id', deviceId)
        .maybeSingle();
    if (error)
        throw error;
    // supabase join returns nested profile
    const profile = data?.profiles;
    return profile ?? null;
}
//# sourceMappingURL=profiles.js.map