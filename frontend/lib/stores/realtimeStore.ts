import { create } from 'zustand';
import type { AlertaStatus, Database } from '../types/database';

type Device = Database['public']['Tables']['devices']['Row'];
type SensorReading = Database['public']['Tables']['sensor_readings']['Row'];
type ThreatEvent = Database['public']['Tables']['threat_events']['Row'];

interface RealtimeState {
  // Device state
  devices: Map<string, Device>;
  
  // Recent sensor readings (keyed by device ID)
  recentReadings: Map<string, SensorReading[]>;
  
  // Recent threat events (global list)
  recentThreats: ThreatEvent[];
  
  // Connection status
  isConnected: boolean;

  // Actions
  upsertDevice: (device: Device) => void;
  updateDeviceStatus: (deviceId: string, updates: Partial<Device>) => void;
  removeDevice: (deviceId: string) => void;
  
  addReading: (reading: SensorReading) => void;
  addThreat: (threat: ThreatEvent) => void;
  updateThreat: (threatId: string, updates: Partial<ThreatEvent>) => void;
  updateAlertaStatus: (threatId: string, alertaStatus: AlertaStatus) => void;
  
  setConnected: (connected: boolean) => void;
  clearAll: () => void;
}

const MAX_READINGS_PER_DEVICE = 50;
const MAX_THREATS = 100;

export const useRealtimeStore = create<RealtimeState>((set) => ({
  devices: new Map(),
  recentReadings: new Map(),
  recentThreats: [],
  isConnected: false,

  upsertDevice: (device) =>
    set((state) => {
      const newDevices = new Map(state.devices);
      newDevices.set(device.id, device);
      return { devices: newDevices };
    }),

  updateDeviceStatus: (deviceId, updates) =>
    set((state) => {
      const device = state.devices.get(deviceId);
      if (!device) return state;

      const newDevices = new Map(state.devices);
      newDevices.set(deviceId, { ...device, ...updates });
      return { devices: newDevices };
    }),

  removeDevice: (deviceId) =>
    set((state) => {
      const newDevices = new Map(state.devices);
      newDevices.delete(deviceId);

      const newReadings = new Map(state.recentReadings);
      newReadings.delete(deviceId);

      return {
        devices: newDevices,
        recentReadings: newReadings,
      };
    }),

  addReading: (reading) =>
    set((state) => {
      const newReadings = new Map(state.recentReadings);
      const deviceReadings = newReadings.get(reading.device_id) || [];

      // Add new reading at the beginning
      const updatedReadings = [reading, ...deviceReadings].slice(
        0,
        MAX_READINGS_PER_DEVICE
      );

      newReadings.set(reading.device_id, updatedReadings);
      return { recentReadings: newReadings };
    }),

  addThreat: (threat) =>
    set((state) => ({
      recentThreats: [threat, ...state.recentThreats].slice(0, MAX_THREATS),
    })),

  updateThreat: (threatId, updates) =>
    set((state) => ({
      recentThreats: state.recentThreats.map((threat) =>
        threat.id === threatId ? { ...threat, ...updates } : threat
      ),
    })),

  updateAlertaStatus: (threatId, alertaStatus) =>
    set((state) => ({
      recentThreats: state.recentThreats.map((threat) =>
        threat.id === threatId
          ? { ...threat, alerta_status: alertaStatus }
          : threat
      ),
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  clearAll: () =>
    set({
      devices: new Map(),
      recentReadings: new Map(),
      recentThreats: [],
      isConnected: false,
    }),
}));

// Helper functions to get data as arrays
export function getDevicesArray(): Device[] {
  return Array.from(useRealtimeStore.getState().devices.values());
}

export function getDeviceReadings(deviceId: string): SensorReading[] {
  return useRealtimeStore.getState().recentReadings.get(deviceId) || [];
}

export function getLatestReading(deviceId: string): SensorReading | null {
  const readings = getDeviceReadings(deviceId);
  return readings[0] || null;
}
