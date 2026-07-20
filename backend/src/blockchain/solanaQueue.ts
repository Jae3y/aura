import * as Sentry from '@sentry/node';
import { writeEventToChain } from '../services/solana';
import {
  updateSolanaSignature,
  setSolanaUnconfirmed,
} from '../lib/db/threat_events';
import { updateVoiceSolanaSignature } from '../lib/db/voice_commands';
import {
  insertOutboxItem,
  getPendingItems,
  markProcessing,
  markComplete,
  markFailed,
  incrementAttempts,
} from '../lib/db/solana_outbox';
import type { OutboxItem } from '../lib/db/solana_outbox';

export interface SolanaQueueItem {
  table: 'threat_events' | 'voice_commands' | 'none';
  rowId: string;
  eventName: string;
  memo: Record<string, unknown>;
  attempts?: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
let running = false;

export async function enqueueSolanaEvent(item: SolanaQueueItem): Promise<void> {
  try {
    await insertOutboxItem({
      table_name: item.table,
      row_id: item.rowId,
      event_name: item.eventName,
      memo: item.memo,
    });
  } catch (err) {
    console.error('[Solana Queue] Failed to persist outbox item:', (err as Error).message);
    Sentry.captureException(err, { tags: { subsystem: 'solana-outbox' } });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function persistSuccess(
  item: OutboxItem,
  signature: string,
  slot: number
): Promise<void> {
  if (item.table_name === 'threat_events') {
    await updateSolanaSignature(item.row_id, signature, slot);
  } else if (item.table_name === 'voice_commands') {
    await updateVoiceSolanaSignature(item.row_id, signature);
  }
}

async function persistFailure(item: OutboxItem): Promise<void> {
  if (item.table_name === 'threat_events') {
    await setSolanaUnconfirmed(item.row_id);
  }
}

async function processItem(item: OutboxItem): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const { signature, slot } = await writeEventToChain({
        eventName: item.event_name,
        memo: item.memo as Record<string, unknown>,
      });
      await persistSuccess(item, signature, slot);
      await markComplete(item.id);
      return;
    } catch (err) {
      lastError = err;
      console.error(
        `[Solana Queue] Attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1} failed for ${item.event_name}:`,
        (err as Error).message
      );
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  const newAttempts = await incrementAttempts(item.id);
  if (newAttempts >= MAX_ATTEMPTS) {
    await persistFailure(item);
    await markFailed(item.id);
    console.error(
      `[Solana Queue] All retries exhausted for ${item.event_name} (${item.table_name}:${item.row_id})`
    );
    Sentry.captureException(lastError, {
      tags: { subsystem: 'solana-queue' },
      extra: {
        eventName: item.event_name,
        table: item.table_name,
        rowId: item.row_id,
        deviceId: (item.memo as Record<string, unknown>).deviceId,
      },
    });
  } else {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { error } = await supabaseAdmin
      .from('solana_outbox')
      .update({ status: 'pending' })
      .eq('id', item.id);
    if (error) console.error('[Solana Queue] Failed to reset status:', error.message);
  }
}

async function loop(): Promise<void> {
  running = true;
  while (true) {
    try {
      const items = await getPendingItems(10);
      if (items.length === 0) {
        await sleep(1000);
        continue;
      }
      for (const item of items) {
        await markProcessing(item.id);
        await processItem(item);
      }
    } catch (err) {
      console.error('[Solana Queue] Loop error:', (err as Error).message);
      Sentry.captureException(err, { tags: { subsystem: 'solana-queue-loop' } });
      await sleep(2000);
    }
  }
}

export function startSolanaQueue(): void {
  if (running) return;
  void loop();
}

export async function _queueLength(): Promise<number> {
  const items = await getPendingItems(1000);
  return items.length;
}
