import { useEffect } from 'react';
import { getSocketClient } from '../socketClient';
import { useRealtimeStore } from '../stores/realtimeStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../toast';
import type { Database } from '../types/database';

type Device = Database['public']['Tables']['devices']['Row'];
type SensorReading = Database['public']['Tables']['sensor_readings']['Row'];
type ThreatEvent = Database['public']['Tables']['threat_events']['Row'];

/**
 * Hook to sync Socket.io events with the realtime store
 * Call this once at the app root level after authentication
 */
export function useRealtimeSync() {
  const { isAuthenticated } = useAuthStore();
  const {
    upsertDevice,
    updateDeviceStatus,
    addReading,
    addThreat,
    updateAlertaStatus,
    setConnected,
  } = useRealtimeStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const socketClient = getSocketClient();

      // Connection status handlers
      const handleConnect = () => {
        console.log('Realtime sync: connected');
        setConnected(true);
      };

      const handleDisconnect = () => {
        console.log('Realtime sync: disconnected');
        setConnected(false);
      };

      // Device event handlers
      const handleDeviceOnline = (data: { device: Device }) => {
        upsertDevice(data.device);
        toast.success(`Device ${data.device.name} is online`, 'Device Online');
      };

      const handleDeviceOffline = (data: { device: Device }) => {
        updateDeviceStatus(data.device.id, {
          is_online: false,
          last_seen: data.device.last_seen,
        });
        toast.warning(`Device ${data.device.name} went offline`, 'Device Offline');
      };

      const handleDevicePaired = (data: { device: Device }) => {
        upsertDevice(data.device);
        toast.success(`Device ${data.device.name} paired successfully`, 'Device Paired');
      };

      // Sensor reading handler
      const handleReadingNew = (data: { reading: SensorReading }) => {
        addReading(data.reading);
      };

      // Threat event handlers
      const handleThreatNew = (data: { threat: ThreatEvent }) => {
        addThreat(data.threat);
        
        // Show toast for critical/high severity threats
        if (data.threat.severity === 'critical' || data.threat.severity === 'high') {
          toast.error(
            data.threat.action_taken ?? data.threat.event_type.replace('_', ' '),
            `${data.threat.severity.toUpperCase()} Threat Detected`
          );
        }
      };

      // Presence detection handler
      const handlePresenceUpdate = (data: {
        zoneId: string;
        deviceId: string;
        presenceDetected: boolean;
      }) => {
        if (data.presenceDetected) {
          toast.info('Motion detected in zone', 'Presence Alert');
        }
      };

      // Voice command handler
      const handleVoiceNew = (data: {
        command: string;
        deviceId: string;
        wasExecuted: boolean;
      }) => {
        if (data.wasExecuted) {
          toast.success(`Voice command: "${data.command}"`, 'Command Executed');
        }
      };

      // Alerta update handler
      const handleAlertaUpdate = (data: {
        threatId: string;
        alertaStatus: string;
      }) => {
        updateAlertaStatus(data.threatId, data.alertaStatus);
      };

      // Register all event listeners
      socketClient.on('connect', handleConnect);
      socketClient.on('disconnect', handleDisconnect);
      socketClient.on('device:online', handleDeviceOnline);
      socketClient.on('device:offline', handleDeviceOffline);
      socketClient.on('device:paired', handleDevicePaired);
      socketClient.on('reading:new', handleReadingNew);
      socketClient.on('threat:new', handleThreatNew);
      socketClient.on('presence:update', handlePresenceUpdate);
      socketClient.on('voice:new', handleVoiceNew);
      socketClient.on('alerta:update', handleAlertaUpdate);

      // Set initial connection status
      if (socketClient.isConnected()) {
        setConnected(true);
      }

      // Cleanup
      return () => {
        socketClient.off('connect', handleConnect);
        socketClient.off('disconnect', handleDisconnect);
        socketClient.off('device:online', handleDeviceOnline);
        socketClient.off('device:offline', handleDeviceOffline);
        socketClient.off('device:paired', handleDevicePaired);
        socketClient.off('reading:new', handleReadingNew);
        socketClient.off('threat:new', handleThreatNew);
        socketClient.off('presence:update', handlePresenceUpdate);
        socketClient.off('voice:new', handleVoiceNew);
        socketClient.off('alerta:update', handleAlertaUpdate);
      };
    } catch (error) {
      console.error('Failed to setup realtime sync:', error);
    }
  }, [
    isAuthenticated,
    upsertDevice,
    updateDeviceStatus,
    addReading,
    addThreat,
    updateAlertaStatus,
    setConnected,
  ]);
}
