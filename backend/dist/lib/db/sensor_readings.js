"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertReading = insertReading;
exports.getRecentReadings = getRecentReadings;
exports.getReadingsByRange = getReadingsByRange;
const supabase_1 = require("../supabase");
async function insertReading(reading) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('sensor_readings')
        .insert(reading)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getRecentReadings(deviceId, limit = 50) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function getReadingsByRange(deviceId, from, to) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .eq('device_id', deviceId)
        .gte('recorded_at', from)
        .lte('recorded_at', to)
        .order('recorded_at', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
//# sourceMappingURL=sensor_readings.js.map