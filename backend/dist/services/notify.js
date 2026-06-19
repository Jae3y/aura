"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyThreat = notifyThreat;
exports.notifyOffline = notifyOffline;
const config_1 = require("../config");
const fcm_1 = require("./fcm");
const email_1 = require("./email");
function isCritical(severity) {
    return severity === 'critical' || severity === 'high';
}
// Sends a threat notification with FCM → Resend fallback.
// Fallback email is dispatched ONLY for critical/high severity FCM failures
// (Property 9), and only when the respective channel flag is enabled.
async function notifyThreat(profile, event, device) {
    const deepLink = `${config_1.config.FRONTEND_URL}/threats?event=${event.id}`;
    let pushDelivered = false;
    if (profile.notification_push && profile.fcm_token) {
        pushDelivered = await (0, fcm_1.sendPush)(profile.fcm_token, {
            title: `AURA ${event.event_type} (${event.severity})`,
            body: `${device.name}: ${event.action_taken ?? event.event_type}`,
            solanaSig: event.solana_signature,
            deepLink,
        });
    }
    let emailDelivered = false;
    if (!pushDelivered &&
        isCritical(event.severity) &&
        profile.notification_email &&
        profile.email) {
        emailDelivered = await (0, email_1.sendThreatAlert)(profile.email, event, device);
    }
    return { pushDelivered, emailDelivered };
}
// Push notification when a device goes offline (Req 12.3).
async function notifyOffline(profile, device) {
    if (!profile.notification_push || !profile.fcm_token)
        return false;
    return (0, fcm_1.sendPush)(profile.fcm_token, {
        title: 'AURA device offline',
        body: `${device.name} stopped responding`,
        solanaSig: null,
        deepLink: `${config_1.config.FRONTEND_URL}/devices/${device.id}`,
    });
}
//# sourceMappingURL=notify.js.map