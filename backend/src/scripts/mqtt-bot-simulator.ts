import mqtt, { MqttClient } from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import path from 'path';
import dotenv from 'dotenv';

// Load root .env
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const supabaseUrl = process.env.SUPABASE_URL || 'https://alqgntqtugmzcglnisrx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const hivemqUrl = process.env.HIVEMQ_URL || 'mqtt://localhost:1883';
const hivemqUser = process.env.HIVEMQ_USER || 'dev-mqtt-user';
const hivemqPass = process.env.HIVEMQ_PASS || 'dev-mqtt-pass';

const supabase = createClient(supabaseUrl, supabaseKey);

interface SelectedDevice {
  id: string;
  device_token: string;
  name: string;
}

let client: MqttClient | null = null;
let currentDevice: SelectedDevice | null = null;
let relayState = { ch1: false, ch2: false, ch3: false, ch4: false };
let presenceDetected = false;
let uptimeSeconds = 0;

async function fetchDevice(): Promise<SelectedDevice> {
  const envDeviceId = process.env.DEVICE_ID;
  const envDeviceToken = process.env.DEVICE_TOKEN;

  if (envDeviceId && envDeviceToken) {
    return {
      id: envDeviceId,
      device_token: envDeviceToken,
      name: 'Custom CLI Device',
    };
  }

  console.log('🔍 Querying Supabase for registered devices...');
  const { data, error } = await supabase
    .from('devices')
    .select('id, device_token, name')
    .limit(10);

  if (error || !data || data.length === 0) {
    console.error('❌ Failed to fetch devices from Supabase:', error?.message);
    console.log('⚠️ Falling back to default test device credentials...');
    return {
      id: '14f54d9e-93a8-4f27-977a-117602070d61',
      device_token: 'aura-sim-QPBA1V6O',
      name: 'Simulated Gateway Node',
    };
  }

  console.log(`✅ Found ${data.length} registered devices:`);
  data.forEach((dev, idx) => {
    console.log(`   [${idx + 1}] ${dev.name} (ID: ${dev.id})`);
  });

  const selected = data[0];
  console.log(`👉 Selected Device: ${selected.name} (${selected.id})\n`);
  return selected;
}

function publishReading() {
  if (!client || !client.connected || !currentDevice) return;
  const baseVoltage = 220 + (Math.random() * 6 - 3);
  const baseCurrent = 3.5 + (Math.random() * 1.5 - 0.75);

  const payload = {
    device_token: currentDevice.device_token,
    voltage: parseFloat(baseVoltage.toFixed(2)),
    current_amps: parseFloat(baseCurrent.toFixed(2)),
    frequency: 50.0,
    power_factor: 0.97,
    anomaly_score: 0.05,
    is_anomaly: false,
  };

  client.publish(`aura/${currentDevice.id}/readings`, JSON.stringify(payload), { qos: 1 });
  console.log(`📊 [TELEMETRY] Sent reading: ${payload.voltage}V | ${payload.current_amps}A`);
}

function publishHeartbeat() {
  if (!client || !client.connected || !currentDevice) return;
  uptimeSeconds += 25;
  const payload = {
    device_token: currentDevice.device_token,
    uptime_s: uptimeSeconds,
    free_heap: 185400,
  };

  client.publish(`aura/${currentDevice.id}/heartbeat`, JSON.stringify(payload), { qos: 0 });
  console.log(`💓 [HEARTBEAT] Sent keep-alive (Uptime: ${uptimeSeconds}s)`);
}

function publishSurge() {
  if (!client || !client.connected || !currentDevice) return;
  const payload = {
    device_token: currentDevice.device_token,
    voltage: 312.8,
    current: 19.4,
    severity: 'high',
    relayChannel: 1,
    actionTaken: 'relay_cutoff',
  };

  client.publish(`aura/${currentDevice.id}/surge`, JSON.stringify(payload), { qos: 1 });
  console.log(`⚡ [SURGE ALERT] High voltage surge detected! Published to aura/${currentDevice.id}/surge`);
}

function publishPresence() {
  if (!client || !client.connected || !currentDevice) return;
  presenceDetected = !presenceDetected;
  const payload = {
    device_token: currentDevice.device_token,
    zoneId: 'default-zone',
    detected: presenceDetected,
    confidence: 0.95,
  };

  client.publish(`aura/${currentDevice.id}/presence`, JSON.stringify(payload), { qos: 1 });
  console.log(`🏃 [PRESENCE] Motion detected: ${presenceDetected} (Confidence: 95%)`);
}

function publishVoice(commandText: string = 'Turn off relay channel one') {
  if (!client || !client.connected || !currentDevice) return;
  const payload = {
    device_token: currentDevice.device_token,
    transcript: commandText,
    confidence: 0.92,
    intent: 'relay_off',
    channel: 1,
    language: 'en',
  };

  client.publish(`aura/${currentDevice.id}/voice`, JSON.stringify(payload), { qos: 1 });
  console.log(`🗣️ [VOICE] Published transcript: "${commandText}"`);
}

async function startSimulator() {
  console.log('====================================================');
  console.log('      🤖 AURA IoT Bot / ESP32 Simulator             ');
  console.log('====================================================\n');

  currentDevice = await fetchDevice();

  console.log(`📡 Connecting to MQTT broker at: ${hivemqUrl}`);
  console.log(`   Client ID: aura-esp32-${currentDevice.id}`);

  client = mqtt.connect(hivemqUrl, {
    username: hivemqUser,
    password: hivemqPass,
    clientId: `aura-esp32-${currentDevice.id}`,
    protocolVersion: 5,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('\n🟢 MQTT Connected to Broker!');

    const cmdTopic = `aura/${currentDevice!.id}/cmd`;
    client!.subscribe(cmdTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${cmdTopic}:`, err.message);
      } else {
        console.log(`📥 Subscribed to command topic: ${cmdTopic}`);
      }
    });

    // Start periodic background tasks
    setInterval(publishReading, 5000);
    setInterval(publishHeartbeat, 25000);

    // Initial publish
    publishHeartbeat();
    publishReading();

    printHelp();
    startCLI();
  });

  client.on('message', (topic, message) => {
    console.log(`\n📬 [COMMAND RECEIVED] Topic: ${topic}`);
    try {
      const payload = JSON.parse(message.toString());
      console.log('   Payload:', JSON.stringify(payload, null, 2));

      if (payload.command === 'relay_on' || payload.command === 'relay_off') {
        const ch = payload.channel || 1;
        const state = payload.command === 'relay_on';
        if (ch === 1) relayState.ch1 = state;
        if (ch === 2) relayState.ch2 = state;
        if (ch === 3) relayState.ch3 = state;
        if (ch === 4) relayState.ch4 = state;
        console.log(`   ⚡ Relay Channel ${ch} set to: ${state ? 'ON' : 'OFF'}`);
        // Send immediate telemetry ACK
        publishReading();
      }
    } catch (e) {
      console.error('❌ Invalid JSON payload received');
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
  });

  client.on('close', () => {
    console.log('⚠️ MQTT Connection closed. Reconnecting...');
  });
}

function printHelp() {
  console.log('\n--- Interactive Commands ---');
  console.log('  [s] surge    - Simulate high voltage surge alert');
  console.log('  [p] presence - Toggle PIR motion presence');
  console.log('  [v] voice    - Simulate voice command ("Turn off relay channel one")');
  console.log('  [r] reading  - Force send reading telemetry');
  console.log('  [h] help     - Show this menu');
  console.log('  [q] quit     - Disconnect and exit');
  console.log('----------------------------\n');
}

function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (line) => {
    const cmd = line.trim().toLowerCase();
    switch (cmd) {
      case 's':
      case 'surge':
        publishSurge();
        break;
      case 'p':
      case 'presence':
        publishPresence();
        break;
      case 'v':
      case 'voice':
        publishVoice();
        break;
      case 'r':
      case 'reading':
        publishReading();
        break;
      case 'h':
      case 'help':
        printHelp();
        break;
      case 'q':
      case 'quit':
      case 'exit':
        console.log('👋 Disconnecting simulator...');
        client?.end(true, () => {
          process.exit(0);
        });
        break;
      default:
        if (cmd.length > 0) {
          console.log(`Unknown command: "${cmd}". Type "h" for help.`);
        }
        break;
    }
  });
}

startSimulator().catch((err) => {
  console.error('Fatal error starting simulator:', err);
});
