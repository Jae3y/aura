import { useEffect } from 'react';
import { getSocketClient } from '../socketClient';

/**
 * Hook to automatically join and leave a device room
 * Use this in device-specific pages/components
 */
export function useDeviceRoom(deviceId: string | null | undefined) {
  useEffect(() => {
    if (!deviceId) return;

    try {
      const socketClient = getSocketClient();
      
      // Join room on mount
      socketClient.joinDeviceRoom(deviceId);

      // Leave room on unmount
      return () => {
        socketClient.leaveDeviceRoom(deviceId);
      };
    } catch (error) {
      console.error('Failed to manage device room:', error);
    }
  }, [deviceId]);
}
