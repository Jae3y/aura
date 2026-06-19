"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVoice = handleVoice;
const voice_commands_1 = require("../lib/db/voice_commands");
const automations_1 = require("../lib/db/automations");
const solanaQueue_1 = require("../blockchain/solanaQueue");
const events_1 = require("../blockchain/events");
const mqtt_1 = require("../services/mqtt");
const socket_1 = require("../socket");
const events_2 = require("../socket/events");
// Minimum confidence to execute a command (Req 10.3).
const MIN_CONFIDENCE = 0.75;
function resolveCommand(payload) {
    const intent = payload.intent?.toLowerCase() ?? payload.transcript.toLowerCase();
    if (intent.includes('relay') && intent.includes('off'))
        return 'relay_off';
    if (intent.includes('relay') && intent.includes('on'))
        return 'relay_on';
    if (intent.includes('reboot'))
        return 'reboot';
    if (intent.includes('status'))
        return 'status';
    return null;
}
async function handleVoice(device, payload) {
    const confidence = payload.confidence ?? 1;
    const command = resolveCommand(payload);
    const shouldExecute = confidence >= MIN_CONFIDENCE && command !== null;
    // 1. Persist voice_command row.
    const cmd = await (0, voice_commands_1.insertVoiceCommand)({
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
        await (0, voice_commands_1.updateVoiceCommand)(cmd.id, { was_executed: false });
        (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.VOICE_NEW, { cmd });
        return;
    }
    // 3. Publish command to device.
    await (0, mqtt_1.publishCommand)(device.id, {
        command: command,
        channel: payload.channel,
        requestedBy: 'voice',
    }).catch(() => undefined);
    // 4. Mark as executed.
    await (0, voice_commands_1.updateVoiceCommand)(cmd.id, { was_executed: true });
    // 5. Enqueue Solana memo.
    (0, solanaQueue_1.enqueueSolanaEvent)({
        table: 'voice_commands',
        rowId: cmd.id,
        eventName: events_1.AURA_SOLANA_EVENTS.VOICE_COMMAND,
        memo: {
            deviceId: device.id,
            command,
            confidence,
            transcript: payload.transcript.slice(0, 80),
        },
    });
    // 6. Evaluate voice-triggered automations.
    const automations = await (0, automations_1.getAutomationsByDevice)(device.id);
    for (const auto of automations) {
        if (!auto.is_active || auto.trigger_type !== 'voice_command')
            continue;
        await (0, automations_1.recordTrigger)(auto);
        await (0, mqtt_1.publishCommand)(device.id, {
            command: auto.action,
            requestedBy: 'automation-voice',
        }).catch(() => undefined);
    }
    // 7. Emit voice:new.
    (0, socket_1.emitToDevice)(device.id, events_2.SOCKET_EVENTS.VOICE_NEW, { cmd: { ...cmd, was_executed: true } });
}
//# sourceMappingURL=voiceHandler.js.map