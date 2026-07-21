"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertReport = upsertReport;
exports.getReportsByDevice = getReportsByDevice;
exports.getReportByMonth = getReportByMonth;
exports.getReportById = getReportById;
exports.updateLiskTx = updateLiskTx;
exports.updatePdfUrl = updatePdfUrl;
const supabase_1 = require("../supabase");
async function upsertReport(report) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .upsert(report, { onConflict: 'device_id,report_month' })
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
async function getReportsByDevice(deviceId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .select('*')
        .eq('device_id', deviceId)
        .order('report_month', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function getReportByMonth(deviceId, reportMonth) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .select('*')
        .eq('device_id', deviceId)
        .eq('report_month', reportMonth)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function getReportById(id) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function updateLiskTx(id, txId) {
    const { error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .update({ lisk_tx_id: txId, lisk_confirmed: true })
        .eq('id', id);
    if (error)
        throw error;
}
async function updatePdfUrl(id, pdfUrl) {
    const { error } = await supabase_1.supabaseAdmin
        .from('monthly_reports')
        .update({ pdf_url: pdfUrl })
        .eq('id', id);
    if (error)
        throw error;
}
//# sourceMappingURL=monthly_reports.js.map