"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
// Canonical Socket.io event name constants shared by server and clients.
exports.SOCKET_EVENTS = {
    // Sensor data
    READING_NEW: 'reading:new',
    // Threats
    THREAT_NEW: 'threat:new',
    // Presence
    PRESENCE_UPDATE: 'presence:update',
    // Voice
    VOICE_NEW: 'voice:new',
    // Device lifecycle
    DEVICE_ONLINE: 'device:online',
    DEVICE_OFFLINE: 'device:offline',
    DEVICE_PAIRED: 'device:paired',
    DEVICE_PAIR_FAILED: 'device:pair_failed',
    // Alerta
    ALERTA_UPDATE: 'alerta:update',
};
//# sourceMappingURL=events.js.map