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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeviceToken = validateDeviceToken;
exports.onMessage = onMessage;
exports.publishCommand = publishCommand;
exports.connectMQTT = connectMQTT;
exports.getMqttClient = getMqttClient;
const mqtt_1 = __importDefault(require("mqtt"));
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
const devices_1 = require("../lib/db/devices");
const surgeHandler_1 = require("../handlers/surgeHandler");
const presenceHandler_1 = require("../handlers/presenceHandler");
const readingHandler_1 = require("../handlers/readingHandler");
const voiceHandler_1 = require("../handlers/voiceHandler");
const heartbeatHandler_1 = require("../handlers/heartbeatHandler");
let client = null;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 60000];
let reconnectAttempt = 0;
async function validateDeviceToken(deviceId, token) {
    if (!token)
        return null;
    return (0, devices_1.getDeviceByToken)(deviceId, token);
}
// Routes a validated message to its handler based on the topic suffix.
async function route(suffix, device, payload) {
    switch (suffix) {
        case 'readings':
            await (0, readingHandler_1.handleReading)(device, payload);
            break;
        case 'surge':
            await (0, surgeHandler_1.handleSurge)(device, payload);
            break;
        case 'presence':
            await (0, presenceHandler_1.handlePresence)(device, payload);
            break;
        case 'voice':
            await (0, voiceHandler_1.handleVoice)(device, payload);
            break;
        case 'heartbeat':
        case 'status':
            await (0, heartbeatHandler_1.handleHeartbeat)(device, payload);
            break;
        default:
            break;
    }
}
// Every inbound message is validated against device_token before any handler
// runs. A token mismatch silently drops the message (Property 4).
async function onMessage(topic, message) {
    try {
        const parts = topic.split('/'); // aura/{deviceId}/{suffix}
        if (parts.length < 3 || parts[0] !== 'aura')
            return;
        const deviceId = parts[1];
        const suffix = parts.slice(2).join('/');
        let payload;
        try {
            payload = JSON.parse(message.toString());
        }
        catch {
            return;
        }
        const token = payload?.device_token ?? payload?.deviceToken;
        const device = await validateDeviceToken(deviceId, token);
        if (!device)
            return; // silent drop
        await route(suffix, device, payload);
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'mqtt' } });
    }
}
function publishCommand(deviceId, command) {
    return new Promise((resolve, reject) => {
        if (!client || !client.connected) {
            reject(new Error('MQTT client not connected'));
            return;
        }
        const payload = JSON.stringify({ ...command, timestamp: Date.now() });
        client.publish(`aura/${deviceId}/cmd`, payload, { qos: 1 }, (err) => (err ? reject(err) : resolve()));
    });
}
function handleDisconnect() {
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttempt += 1;
    setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(`MQTT reconnecting (attempt ${reconnectAttempt})...`);
        client?.reconnect();
    }, delay);
}
function connectMQTT() {
    return new Promise((resolve, reject) => {
        client = mqtt_1.default.connect(config_1.config.HIVEMQ_URL, {
            username: config_1.config.HIVEMQ_USER,
            password: config_1.config.HIVEMQ_PASS,
            protocolVersion: 5,
            reconnectPeriod: 0, // manual back-off via handleDisconnect
        });
        client.on('connect', () => {
            reconnectAttempt = 0;
            client.subscribe('aura/+/#', { qos: 1 });
            // eslint-disable-next-line no-console
            console.log('📡 MQTT connected to HiveMQ');
            resolve(client);
        });
        client.on('message', (topic, message) => void onMessage(topic, message));
        client.on('error', (err) => {
            Sentry.captureException(err, { tags: { subsystem: 'mqtt' } });
            reject(err);
        });
        client.on('close', handleDisconnect);
    });
}
function getMqttClient() {
    return client;
}
//# sourceMappingURL=mqtt.js.map