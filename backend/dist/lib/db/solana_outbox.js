"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOutboxItem = insertOutboxItem;
exports.getPendingItems = getPendingItems;
exports.markProcessing = markProcessing;
exports.markFailed = markFailed;
exports.markComplete = markComplete;
exports.incrementAttempts = incrementAttempts;
const supabase_1 = require("../supabase");
async function insertOutboxItem(item) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .insert({
        table_name: item.table_name,
        row_id: item.row_id,
        event_name: item.event_name,
        memo: item.memo,
        attempts: 0,
        status: 'pending',
    })
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getPendingItems(limit = 50) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function markProcessing(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .update({ status: 'processing' })
        .eq('id', id);
    if (error)
        throw error;
}
async function markFailed(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .update({ status: 'failed' })
        .eq('id', id);
    if (error)
        throw error;
}
async function markComplete(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
}
async function incrementAttempts(id) {
    const { data: current } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .select('attempts')
        .eq('id', id)
        .single();
    const newAttempts = (current?.attempts ?? 0) + 1;
    const { error } = await supabase_1.supabaseAdmin
        .from('solana_outbox')
        .update({ attempts: newAttempts })
        .eq('id', id);
    if (error)
        throw error;
    return newAttempts;
}
//# sourceMappingURL=solana_outbox.js.map