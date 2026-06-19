// Canonical Socket.io event name constants shared by server and clients.
export const SOCKET_EVENTS = {
  // Sensor data
  READING_NEW: 'reading:new',

  // Threats
  THREAT_NEW: 'threat:new',

  // Presence
  PRESENCE_UPDATE: 'presence:update',

  // Voice
  VOICE_NEW: 'voice:new',

  // Device lifecycle
  DEVICE_ONLINE: 'device:online',
  DEVICE_OFFLINE: 'device:offline',
  DEVICE_PAIRED: 'device:paired',
  DEVICE_PAIR_FAILED: 'device:pair_failed',

  // Alerta
  ALERTA_UPDATE: 'alerta:update',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
