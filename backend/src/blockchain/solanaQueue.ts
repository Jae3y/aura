import * as Sentry from '@sentry/node';
import { writeEventToChain } from '../services/solana';
import {
  updateSolanaSignature,
  setSolanaUnconfirmed,
} from '../lib/db/threat_events';
import { updateVoiceSolanaSignature } from '../lib/db/voice_commands';

export interface SolanaQueueItem {
  table: 'threat_events' | 'voice_commands' | 'none';
  rowId: string;
  eventName: string;
  memo: Record<string, unknown>;
  attempts?: number;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 3 retries, exponential back-off
const queue: SolanaQueueItem[] = [];
let running = false;

export function enqueueSolanaEvent(item: SolanaQueueItem): void {
  queue.push({ ...item, attempts: 0 });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function persistSuccess(
  item: SolanaQueueItem,
  signature: string,
  slot: number
): Promise<void> {
  if (item.table === 'threat_events') {
    await updateSolanaSignature(item.rowId, signature, slot);
  } else if (item.table === 'voice_commands') {
    await updateVoiceSolanaSignature(item.rowId, signature);
  }
}

async function persistFailure(item: SolanaQueueItem): Promise<void> {
  if (item.table === 'threat_events') {
    await setSolanaUnconfirmed(item.rowId);
  }
}

// Processes one item with up to 3 retries. On exhaustion sets the row
// unconfirmed and captures exactly one Sentry error.
async function processItem(item: SolanaQueueItem): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const { signature, slot } = await writeEventToChain({
        eventName: item.eventName,
        memo: item.memo,
      });
      await persistSuccess(item, signature, slot);
      return;
    } catch (err) {
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

async function loop(): Promise<void> {
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

export function startSolanaQueue(): void {
  if (running) return;
  void loop();
}

export function _queueLength(): number {
  return queue.length;
}
