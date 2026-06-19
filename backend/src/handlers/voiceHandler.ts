import type { Device } from '../types/database';
import { insertVoiceCommand, updateVoiceCommand } from '../lib/db/voice_commands';
import { getAutomationsByDevice, recordTrigger } from '../lib/db/automations';
import { enqueueSolanaEvent } from '../blockchain/solanaQueue';
import { AURA_SOLANA_EVENTS } from '../blockchain/events';
import { publishCommand } from '../services/mqtt';
import { emitToDevice } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

interface VoicePayload {
  transcript: string;
  confidence?: number;
  intent?: string;
  channel?: number;
  language?: string;
}

// Minimum confidence to execute a command (Req 10.3).
const MIN_CONFIDENCE = 0.75;

function resolveCommand(payload: VoicePayload): string | null {
  const intent = payload.intent?.toLowerCase() ?? payload.transcript.toLowerCase();
  if (intent.includes('relay') && intent.includes('off')) return 'relay_off';
  if (intent.includes('relay') && intent.includes('on')) return 'relay_on';
  if (intent.includes('reboot')) return 'reboot';
  if (intent.includes('status')) return 'status';
  return null;
}

export async function handleVoice(
  device: Device,
  payload: VoicePayload
): Promise<void> {
  const confidence = payload.confidence ?? 1;
  const command = resolveCommand(payload);
  const shouldExecute = confidence >= MIN_CONFIDENCE && command !== null;

  // 1. Persist voice_command row.
  const cmd = await insertVoiceCommand({
    device_id: device.id,
    user_id: device.user_id,
    raw_command: payload.transcript,
    confidence_score: confidence,
    parsed_intent: payload.intent ?? null,
    action_triggered: command,
    was_executed: false,
  });

  // 2. If confidence too low or intent unrecognised — mark and stop.
  if (!shouldExecute) {
    await updateVoiceCommand(cmd.id, { was_executed: false });
    emitToDevice(device.id, SOCKET_EVENTS.VOICE_NEW, { cmd });
    return;
  }

  // 3. Publish command to device.
  await publishCommand(device.id, {
    command: command!,
    channel: payload.channel,
    requestedBy: 'voice',
  }).catch(() => undefined);

  // 4. Mark as executed.
  await updateVoiceCommand(cmd.id, { was_executed: true });

  // 5. Enqueue Solana memo.
  enqueueSolanaEvent({
    table: 'voice_commands',
    rowId: cmd.id,
    eventName: AURA_SOLANA_EVENTS.VOICE_COMMAND,
    memo: {
      deviceId: device.id,
      command,
      confidence,
      transcript: payload.transcript.slice(0, 80),
    },
  });

  // 6. Evaluate voice-triggered automations.
  const automations = await getAutomationsByDevice(device.id);
  for (const auto of automations) {
    if (!auto.is_active || auto.trigger_type !== 'voice_command') continue;
    await recordTrigger(auto);
    await publishCommand(device.id, {
      command: auto.action,
      requestedBy: 'automation-voice',
    }).catch(() => undefined);
  }

  // 7. Emit voice:new.
  emitToDevice(device.id, SOCKET_EVENTS.VOICE_NEW, { cmd: { ...cmd, was_executed: true } });
}
