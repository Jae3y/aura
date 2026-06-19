"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHeartbeat = handleHeartbeat;
exports.clearWatchdog = clearWatchdog;
const Sentry = __importStar(require("@sentry/node"));
const devices_1 = require("../lib/db/devices");
const profiles_1 = require("../lib/db/profiles");
const alerta_1 = require("../services/alerta");
const notify_1 = require("../services/notify");
const socket_1 = require("../socket");
const events_1 = require("../socket/events");
// Per-device watchdog timers: deviceId → NodeJS.Timeout
const watchdogs = new Map();
// If no heartbeat arrives within this window the device is declared offline.
const OFFLINE_TIMEOUT_MS = 90_000; // 90 s
async function declareOffline(device) {
    try {
        await (0, devices_1.updateDeviceStatus)(device.id, false);
        (0, socket_1.emitToDevice)(device.id, events_1.SOCKET_EVENTS.DEVICE_OFFLINE, {
            deviceId: device.id,
        });
        // Submit Alerta major alert.
        await (0, alerta_1.sendAlert)((0, alerta_1.buildOfflinePayload)(device));
        // FCM push to owner.
        const owner = await (0, profiles_1.getOwnerProfileForDevice)(device.id);
        if (owner)
            await (0, notify_1.notifyOffline)(owner, device);
    }
    catch (err) {
        Sentry.captureException(err, {
            tags: { subsystem: 'heartbeat-offline' },
            extra: { deviceId: device.id },
        });
    }
}
function resetWatchdog(device) {
    const existing = watchdogs.get(device.id);
    if (existing)
        clearTimeout(existing);
    const timer = setTimeout(() => {
        watchdogs.delete(device.id);
        void declareOffline(device);
    }, OFFLINE_TIMEOUT_MS);
    // Allow Node.js to exit even if timer is pending (integration-test friendliness).
    if (typeof timer === 'object' && 'unref' in timer) {
        timer.unref();
    }
    watchdogs.set(device.id, timer);
}
async function handleHeartbeat(device, _payload) {
    // 1. Update last_seen + is_online flag.
    await (0, devices_1.updateLastSeen)(device.id);
    // 2. Re-arm watchdog — any heartbeat resets the 90 s timer.
    resetWatchdog(device);
    // 3. Emit device:online so the dashboard reflects live status.
    (0, socket_1.emitToDevice)(device.id, events_1.SOCKET_EVENTS.DEVICE_ONLINE, {
        deviceId: device.id,
        lastSeen: new Date().toISOString(),
    });
}
// Exported for testing.
function clearWatchdog(deviceId) {
    const t = watchdogs.get(deviceId);
    if (t) {
        clearTimeout(t);
        watchdogs.delete(deviceId);
    }
}
//# sourceMappingURL=heartbeatHandler.js.map