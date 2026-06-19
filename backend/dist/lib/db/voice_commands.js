"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertVoiceCommand = insertVoiceCommand;
exports.updateVoiceCommand = updateVoiceCommand;
exports.getVoiceCommandsByDevice = getVoiceCommandsByDevice;
exports.updateVoiceSolanaSignature = updateVoiceSolanaSignature;
const supabase_1 = require("../supabase");
async function insertVoiceCommand(cmd) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('voice_commands')
        .insert(cmd)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateVoiceCommand(id, patch) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('voice_commands')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getVoiceCommandsByDevice(deviceId, limit = 100) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('voice_commands')
        .select('*')
        .eq('device_id', deviceId)
        .order('issued_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function updateVoiceSolanaSignature(id, sig) {
    const { error } = await supabase_1.supabaseAdmin
        .from('voice_commands')
        .update({ solana_signature: sig, solana_confirmed: true })
        .eq('id', id);
    if (error)
        throw error;
}
//# sourceMappingURL=voice_commands.js.map