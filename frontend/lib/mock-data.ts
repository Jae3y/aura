export const mockDevices = [
  {
    id: "1",
    name: "Main Security Gateway",
    status: "online",
    ip: "192.168.1.1",
    lastSeen: new Date(),
    type: "gateway"
  },
  {
    id: "2",
    name: "Living Room Camera",
    status: "online",
    ip: "192.168.1.101",
    lastSeen: new Date(),
    type: "camera"
  },
  {
    id: "3",
    name: "Front Door Lock",
    status: "online",
    ip: "192.168.1.5",
    lastSeen: new Date(),
    type: "lock"
  },
  {
    id: "4",
    name: "Garage Door Opener",
    status: "offline",
    ip: "192.168.1.22",
    lastSeen: new Date(Date.now() - 3600000),
    type: "controller"
  }
];

export const mockThreats = [
  {
    id: "1",
    type: "human_detection",
    severity: "critical",
    status: "open",
    source: "Front Camera",
    description: "Unidentified person detected at main gate",
    occurred_at: new Date(Date.now() - 120000).toISOString(),
    solana_verified: false
  },
  {
    id: "2",
    type: "motion_detection",
    severity: "warning",
    status: "acknowledged",
    source: "Living Room Motion Sensor",
    description: "Unusual motion detected after hours",
    occurred_at: new Date(Date.now() - 3600000).toISOString(),
    solana_verified: true
  },
  {
    id: "3",
    type: "device_offline",
    severity: "info",
    status: "closed",
    source: "Garage Door Opener",
    description: "Device connectivity lost",
    occurred_at: new Date(Date.now() - 7200000).toISOString(),
    solana_verified: false
  }
];

export const mockSensorReadings = [
  {
    id: "1",
    deviceId: "1",
    voltage: 220,
    current_amps: 1.5,
    power_watts: 330,
    frequency: 60,
    timestamp: new Date().toISOString()
  }
];

export const mockNotifications = [
  {
    id: "1",
    title: "Threat Detected!",
    body: "Human presence detected at front gate",
    is_read: false,
    created_at: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: "2",
    title: "System Update Complete",
    body: "All security patches have been applied",
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export const mockReports = [
  {
    id: "1",
    title: "Daily Security Summary",
    type: "daily",
    generated_at: new Date().toISOString(),
    events_count: 15,
    threats_count: 2
  },
  {
    id: "2",
    title: "Monthly Compliance Report",
    type: "monthly",
    generated_at: new Date(Date.now() - 2592000000).toISOString(),
    events_count: 450,
    threats_count: 32
  }
];
