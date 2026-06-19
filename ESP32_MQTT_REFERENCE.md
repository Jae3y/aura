# AURA ESP32 MQTT Reference

> Firmware teammate quick-reference. All MQTT communication uses **HiveMQ Cloud** over TLS port 8883 with **MQTT v5**.

---

## 1. Broker Connection

| Setting | Value |
|---|---|
| Host | `<HIVEMQ_HOST>.hivemq.cloud` |
| Port | `8883` (TLS) |
| Protocol | MQTT v5 |
| Username | `<HIVEMQ_USER>` (from `.env`) |
| Password | `<HIVEMQ_PASS>` (from `.env`) |
| Client ID | `aura-esp32-<deviceId>` (must be unique per device) |
| Keep-alive | 60 s |
| Clean session | `true` |

---

## 2. Topic Naming Convention

```
aura/<deviceId>/<suffix>
```

`<deviceId>` is the UUID from the AURA backend (`devices.id`).

---

## 3. All Topics and QoS Levels

| Direction | Topic | QoS | Description |
|---|---|---|---|
| Publish | `aura/<id>/readings` | 1 | Periodic sensor data |
| Publish | `aura/<id>/surge` | 1 | Surge event detected |
| Publish | `aura/<id>/presence` | 1 | PIR/zone presence change |
| Publish | `aura/<id>/voice` | 1 | Voice command transcript |
| Publish | `aura/<id>/heartbeat` | 0 | Keep-alive (every 30 s) |
| Subscribe | `aura/<id>/cmd` | 1 | Relay / system commands |
| Subscribe | `aura/<id>/status` | 1 | Backend status pushes (alias heartbeat) |

---

## 4. Payload Shapes (JSON)

Every outbound payload **must** include `device_token` for server-side auth.

### 4.1 `readings`
```json
{
  "device_token": "<token>",
  "voltage": 226.4,
  "current_amps": 4.2,
  "frequency": 50.1,
  "power_factor": 0.97,
  "anomaly_score": 0.12,
  "is_anomaly": false
}
```

### 4.2 `surge`
```json
{
  "device_token": "<token>",
  "voltage": 310.5,
  "current": 18.2,
  "severity": "high",
  "relayChannel": 1,
  "actionTaken": "relay_cutoff"
}
```

### 4.3 `presence`
```json
{
  "device_token": "<token>",
  "zoneId": "<uuid>",
  "detected": true,
  "confidence": 0.93
}
```

### 4.4 `voice`
```json
{
  "device_token": "<token>",
  "transcript": "Turn off relay channel one",
  "confidence": 0.91,
  "intent": "relay_off",
  "channel": 1,
  "language": "en"
}
```

### 4.5 `heartbeat`
```json
{
  "device_token": "<token>",
  "uptime_s": 3600,
  "free_heap": 180000
}
```

### 4.6 Inbound `cmd` payload
```json
{
  "command": "relay_off",
  "channel": 1,
  "requestedBy": "aura-auto",
  "solanaSignature": "<sig_or_empty>",
  "timestamp": 1718700000000
}
```

---

## 5. Reconnect Logic (Exponential Back-off)

Use the following delays (ms) between reconnect attempts:
`1000 → 2000 → 4000 → 8000 → 60000` (cap at 60 s).

```cpp
const int delays[] = {1000, 2000, 4000, 8000, 60000};
int attempt = 0;

void reconnect() {
  while (!client.connected()) {
    int delay_ms = delays[min(attempt, 4)];
    attempt++;
    delay(delay_ms);
    if (client.connect(clientId, mqttUser, mqttPass)) {
      attempt = 0;
      client.subscribe(cmdTopic, 1);
    }
  }
}
```

---

## 6. Arduino Publish Snippets

```cpp
// readings
void publishReading(float v, float i, float freq, float pf) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"device_token\":\"%s\",\"voltage\":%.2f,\"current_amps\":%.2f,"
    "\"frequency\":%.2f,\"power_factor\":%.2f,\"is_anomaly\":false}",
    DEVICE_TOKEN, v, i, freq, pf);
  client.publish("aura/" DEVICE_ID "/readings", payload, false, 1);
}

// surge
void publishSurge(float v, float i) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"device_token\":\"%s\",\"voltage\":%.2f,\"current\":%.2f,"
    "\"severity\":\"high\",\"relayChannel\":1,\"actionTaken\":\"relay_cutoff\"}",
    DEVICE_TOKEN, v, i);
  client.publish("aura/" DEVICE_ID "/surge", payload, false, 1);
}

// heartbeat (QoS 0, every 30 s)
void publishHeartbeat() {
  char payload[128];
  snprintf(payload, sizeof(payload),
    "{\"device_token\":\"%s\",\"uptime_s\":%lu}",
    DEVICE_TOKEN, millis() / 1000);
  client.publish("aura/" DEVICE_ID "/heartbeat", payload, false, 0);
}
```

---

## 7. Important Notes

- **90-second watchdog**: the backend declares the device offline if no heartbeat arrives within 90 s. Publish heartbeat every **≤30 s**.
- **Token authentication**: the `device_token` must match `devices.device_token` in Supabase. Messages with missing or wrong tokens are silently dropped.
- **Relay command ACK**: after receiving a `cmd` message, publish the resulting state back on `aura/<id>/readings` so the backend can confirm.
- **TLS requirement**: plain TCP (port 1883) is rejected by HiveMQ Cloud. Always use port 8883 with CA certificate.
