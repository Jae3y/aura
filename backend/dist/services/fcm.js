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
exports.sendPush = sendPush;
exports.sendBulkPush = sendBulkPush;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
let app = null;
function getApp() {
    if (app)
        return app;
    if (!config_1.config.FCM_CLIENT_EMAIL || !config_1.config.FCM_PRIVATE_KEY)
        return null;
    app = firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId: config_1.config.FCM_PROJECT_ID,
            clientEmail: config_1.config.FCM_CLIENT_EMAIL,
            privateKey: config_1.config.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
    return app;
}
function buildMessage(payload) {
    return {
        notification: { title: payload.title, body: payload.body },
        data: {
            solanaSig: payload.solanaSig ?? '',
            url: payload.deepLink,
        },
    };
}
// Returns true on successful delivery, false on failure (caller decides on
// fallback). Never throws.
async function sendPush(token, payload) {
    const a = getApp();
    if (!a || !token)
        return false;
    try {
        await firebase_admin_1.default.messaging(a).send({ token, ...buildMessage(payload) });
        return true;
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'fcm' } });
        return false;
    }
}
async function sendBulkPush(tokens, payload) {
    const a = getApp();
    const valid = tokens.filter(Boolean);
    if (!a || valid.length === 0)
        return false;
    try {
        const res = await firebase_admin_1.default
            .messaging(a)
            .sendEachForMulticast({ tokens: valid, ...buildMessage(payload) });
        return res.successCount > 0;
    }
    catch (err) {
        Sentry.captureException(err, { tags: { subsystem: 'fcm' } });
        return false;
    }
}
//# sourceMappingURL=fcm.js.map