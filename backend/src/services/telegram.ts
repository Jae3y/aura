import axios from 'axios';
import FormData from 'form-data';
import * as Sentry from '@sentry/node';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Telegram Bot API — direct file/document delivery.
// Used to send PDF reports that Alerta's text-only API cannot deliver.
// ---------------------------------------------------------------------------

const BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

function isConfigured(): boolean {
  return Boolean(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID);
}

export async function sendDocument(
  fileUrl: string,
  caption: string,
  filename = 'document.pdf'
): Promise<boolean> {
  console.log('[Telegram] sendDocument called:', { fileUrl: fileUrl?.substring(0, 80), filename });

  if (!isConfigured()) {
    console.warn('[Telegram] Bot token or chat ID not configured — skipping document send');
    console.warn('[Telegram] Token:', config.TELEGRAM_BOT_TOKEN ? 'set' : 'MISSING');
    console.warn('[Telegram] Chat ID:', config.TELEGRAM_CHAT_ID ? 'set' : 'MISSING');
    return false;
  }

  try {
    // Download the file from the source URL.
    console.log('[Telegram] Downloading PDF from Supabase...');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(response.data);
    console.log('[Telegram] Downloaded', buffer.length, 'bytes');

    // Build multipart form for Telegram sendDocument API.
    const form = new FormData();
    form.append('chat_id', config.TELEGRAM_CHAT_ID!);
    form.append('caption', caption);
    form.append('document', buffer, { filename, contentType: 'application/pdf' });

    console.log('[Telegram] Sending to Telegram Bot API...');
    const res = await axios.post(`${BASE}/sendDocument`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    if (res.data?.ok) {
      console.log('[Telegram] PDF sent successfully');
      return true;
    }

    console.error('[Telegram] API returned non-ok:', res.data);
    return false;
  } catch (err) {
    console.error('[Telegram] sendDocument failed:', (err as Error).message);
    Sentry.captureException(err, { tags: { subsystem: 'telegram' } });
    return false;
  }
}
