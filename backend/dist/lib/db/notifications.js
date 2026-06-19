"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.getNotifications = getNotifications;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.getUnreadCount = getUnreadCount;
const supabase_1 = require("../supabase");
async function createNotification(notification) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('notifications')
        .insert(notification)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getNotifications(userId, limit = 50) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function markAsRead(id) {
    const { error } = await supabase_1.supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    if (error)
        throw error;
}
async function markAllAsRead(userId) {
    const { error } = await supabase_1.supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error)
        throw error;
}
async function getUnreadCount(userId) {
    const { count, error } = await supabase_1.supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error)
        throw error;
    return count ?? 0;
}
//# sourceMappingURL=notifications.js.map