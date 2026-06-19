import axios from 'axios';
import * as Sentry from '@sentry/node';
import { config } from '../config';
import { updateLiskTx } from '../lib/db/monthly_reports';
import type { MonthlyReport } from '../types/database';

// The Lisk service is intentionally minimal: a single function with a single
// call site (the monthly report job). It is NEVER called from a real-time
// event handler — Lisk is the secondary, monthly-only audit chain.

let initialized = false;

export function initLiskClient(): void {
  initialized = true;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface LiskAuditDigest {
  deviceId: string;
  month: string;
  totalThreats: number;
  surgesBlocked: number;
  healthScore: number;
  solanaEventsLogged: number;
}

async function submitToLisk(digest: LiskAuditDigest): Promise<string> {
  if (!config.LISK_RPC_URL) {
    // No Lisk endpoint configured — derive a deterministic local digest id so
    // the flow remains testable without a live testnet.
    return `lisk-local-${digest.deviceId}-${digest.month}`;
  }
  const res = await axios.post(
    `${config.LISK_RPC_URL}/api/v3/transactions`,
    { module: 'aura', command: 'monthlyAudit', params: digest },
    { timeout: 10000 }
  );
  const txId = res.data?.transactionId ?? res.data?.txId;
  if (!txId) throw new Error('Lisk did not return a transaction id');
  return txId;
}

// Writes the report digest to Lisk testnet with 3× retry/back-off and updates
// monthly_reports.lisk_tx_id on success.
export async function writeMonthlyAudit(
  report: MonthlyReport
): Promise<{ txId: string } | null> {
  if (!initialized) initLiskClient();

  const digest: LiskAuditDigest = {
    deviceId: report.device_id,
    month: report.report_month,
    totalThreats: report.total_threats,
    surgesBlocked: report.surges_blocked,
    healthScore: report.aura_health_score,
    solanaEventsLogged: report.solana_events_logged,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const txId = await submitToLisk(digest);
      await updateLiskTx(report.id, txId);
      return { txId };
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  Sentry.captureException(lastError, {
    tags: { subsystem: 'lisk' },
    extra: { deviceId: report.device_id, month: report.report_month },
  });
  return null;
}
