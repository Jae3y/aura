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
exports.sendDocument = sendDocument;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const Sentry = __importStar(require("@sentry/node"));
const config_1 = require("../config");
// ---------------------------------------------------------------------------
// Telegram Bot API — direct file/document delivery.
// Used to send PDF reports that Alerta's text-only API cannot deliver.
// ---------------------------------------------------------------------------
const BASE = `https://api.telegram.org/bot${config_1.config.TELEGRAM_BOT_TOKEN}`;
function isConfigured() {
    return Boolean(config_1.config.TELEGRAM_BOT_TOKEN && config_1.config.TELEGRAM_CHAT_ID);
}
async function sendDocument(fileUrl, caption, filename = 'document.pdf') {
    if (!isConfigured()) {
        console.warn('[Telegram] Bot token or chat ID not configured — skipping document send');
        return false;
    }
    try {
        // Download the file from the source URL.
        const response = await axios_1.default.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(response.data);
        // Build multipart form for Telegram sendDocument API.
        const form = new form_data_1.default();
        form.append('chat_id', config_1.config.TELEGRAM_CHAT_ID);
        form.append('caption', caption);
        form.append('document', buffer, { filename, contentType: 'application/pdf' });
        const res = await axios_1.default.post(`${BASE}/sendDocument`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
        });
        if (res.data?.ok) {
            console.log('[Telegram] PDF sent successfully');
            return true;
        }
        console.error('[Telegram] API returned non-ok:', res.data);
        return false;
    }
    catch (err) {
        console.error('[Telegram] sendDocument failed:', err.message);
        Sentry.captureException(err, { tags: { subsystem: 'telegram' } });
        return false;
    }
}
//# sourceMappingURL=telegram.js.map