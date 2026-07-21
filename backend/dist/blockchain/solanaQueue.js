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
const solana_outbox_1 = require("../lib/db/solana_outbox");
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
let running = false;
let outboxReady = false;
let outboxMissingLogged = false;
async function enqueueSolanaEvent(item) {
    try {
        await (0, solana_outbox_1.insertOutboxItem)({
            table_name: item.table,
            row_id: item.rowId,
            event_name: item.eventName,
            memo: item.memo,
        });
    }
    catch (err) {
        console.error('[Solana Queue] Failed to persist outbox item:', err.message);
        Sentry.captureException(err, { tags: { subsystem: 'solana-outbox' } });
    }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function persistSuccess(item, signature, slot) {
    if (item.table_name === 'threat_events') {
        await (0, threat_events_1.updateSolanaSignature)(item.row_id, signature, slot);
    }
    else if (item.table_name === 'voice_commands') {
        await (0, voice_commands_1.updateVoiceSolanaSignature)(item.row_id, signature);
    }
}
async function persistFailure(item) {
    if (item.table_name === 'threat_events') {
        await (0, threat_events_1.setSolanaUnconfirmed)(item.row_id);
    }
}
async function processItem(item) {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
            const { signature, slot } = await (0, solana_1.writeEventToChain)({
                eventName: item.event_name,
                memo: item.memo,
            });
            await persistSuccess(item, signature, slot);
            await (0, solana_outbox_1.markComplete)(item.id);
            return;
        }
        catch (err) {
            lastError = err;
            console.error(`[Solana Queue] Attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1} failed for ${item.event_name}:`, err.message);
            if (attempt < RETRY_DELAYS_MS.length) {
                await sleep(RETRY_DELAYS_MS[attempt]);
            }
        }
    }
    const newAttempts = await (0, solana_outbox_1.incrementAttempts)(item.id);
    if (newAttempts >= MAX_ATTEMPTS) {
        await persistFailure(item);
        await (0, solana_outbox_1.markFailed)(item.id);
        console.error(`[Solana Queue] All retries exhausted for ${item.event_name} (${item.table_name}:${item.row_id})`);
        Sentry.captureException(lastError, {
            tags: { subsystem: 'solana-queue' },
            extra: {
                eventName: item.event_name,
                table: item.table_name,
                rowId: item.row_id,
                deviceId: item.memo.deviceId,
            },
        });
    }
    else {
        const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require('../lib/supabase')));
        const { error } = await supabaseAdmin
            .from('solana_outbox')
            .update({ status: 'pending' })
            .eq('id', item.id);
        if (error)
            console.error('[Solana Queue] Failed to reset status:', error.message);
    }
}
async function loop() {
    running = true;
    while (true) {
        try {
            const items = await (0, solana_outbox_1.getPendingItems)(10);
            outboxReady = true;
            if (!outboxMissingLogged) {
                outboxMissingLogged = true;
                console.log('[Solana Queue] Outbox table connected');
            }
            if (items.length === 0) {
                await sleep(1000);
                continue;
            }
            for (const item of items) {
                await (0, solana_outbox_1.markProcessing)(item.id);
                await processItem(item);
            }
        }
        catch (err) {
            const msg = err.message ?? '';
            if (msg.includes('solana_outbox') && msg.includes('Could not find')) {
                if (!outboxMissingLogged) {
                    console.warn('[Solana Queue] solana_outbox table not found — queue paused. ' +
                        'Run the migration in supabase/migrations/002_solana_outbox.sql to enable.');
                    outboxMissingLogged = true;
                }
                await sleep(30_000);
                continue;
            }
            console.error('[Solana Queue] Loop error:', msg);
            Sentry.captureException(err, { tags: { subsystem: 'solana-queue-loop' } });
            await sleep(2000);
        }
    }
}
function startSolanaQueue() {
    if (running)
        return;
    void loop();
}
async function _queueLength() {
    const items = await (0, solana_outbox_1.getPendingItems)(1000);
    return items.length;
}
//# sourceMappingURL=solanaQueue.js.map