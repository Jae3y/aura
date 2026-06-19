"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAutomationsByDevice = getAutomationsByDevice;
exports.getAutomationById = getAutomationById;
exports.createAutomation = createAutomation;
exports.updateAutomation = updateAutomation;
exports.deleteAutomation = deleteAutomation;
exports.recordTrigger = recordTrigger;
const supabase_1 = require("../supabase");
async function getAutomationsByDevice(deviceId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('automations')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
async function getAutomationById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('automations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function createAutomation(automation) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('automations')
        .insert(automation)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function updateAutomation(id, patch) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('automations')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteAutomation(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('automations')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
}
async function recordTrigger(automation) {
    return updateAutomation(automation.id, {
        trigger_count: automation.trigger_count + 1,
        last_triggered_at: new Date().toISOString(),
    });
}
//# sourceMappingURL=automations.js.map