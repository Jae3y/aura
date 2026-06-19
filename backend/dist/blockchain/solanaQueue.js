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
exports.enqueueSolanaEvent = enqueueSolanaEvent;
exports.startSolanaQueue = startSolanaQueue;
exports._queueLength = _queueLength;
const Sentry = __importStar(require("@sentry/node"));
const solana_1 = require("../services/solana");
const threat_events_1 = require("../lib/db/threat_events");
const voice_commands_1 = require("../lib/db/voice_commands");
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 3 retries, exponential back-off
const queue = [];
let running = false;
function enqueueSolanaEvent(item) {
    queue.push({ ...item, attempts: 0 });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function persistSuccess(item, signature, slot) {
    if (item.table === 'threat_events') {
        await (0, threat_events_1.updateSolanaSignature)(item.rowId, signature, slot);
    }
    else if (item.table === 'voice_commands') {
        await (0, voice_commands_1.updateVoiceSolanaSignature)(item.rowId, signature);
    }
}
async function persistFailure(item) {
    if (item.table === 'threat_events') {
        await (0, threat_events_1.setSolanaUnconfirmed)(item.rowId);
    }
}
// Processes one item with up to 3 retries. On exhaustion sets the row
// unconfirmed and captures exactly one Sentry error.
async function processItem(item) {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
            const { signature, slot } = await (0, solana_1.writeEventToChain)({
                eventName: item.eventName,
                memo: item.memo,
            });
            await persistSuccess(item, signature, slot);
            return;
        }
        catch (err) {
            lastError = err;
            if (attempt < RETRY_DELAYS_MS.length) {
                await sleep(RETRY_DELAYS_MS[attempt]);
            }
        }
    }
    await persistFailure(item);
    Sentry.captureException(lastError, {
        tags: { subsystem: 'solana-queue' },
        extra: {
            eventName: item.eventName,
            table: item.table,
            rowId: item.rowId,
            deviceId: item.memo.deviceId,
        },
    });
}
async function loop() {
    running = true;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const item = queue.shift();
        if (!item) {
            await sleep(500);
            continue;
        }
        await processItem(item);
    }
}
function startSolanaQueue() {
    if (running)
        return;
    void loop();
}
function _queueLength() {
    return queue.length;
}
//# sourceMappingURL=solanaQueue.js.map