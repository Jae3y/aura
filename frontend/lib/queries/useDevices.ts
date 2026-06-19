import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toast } from '../toast';
import * as Sentry from '@sentry/nextjs';
import type { Database } from '../types/database';

type Device = Database['public']['Tables']['devices']['Row'];
type DeviceInsert = Database['public']['Tables']['devices']['Insert'];
type DeviceUpdate = Database['public']['Tables']['devices']['Update'];

// Query keys
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...deviceKeys.lists(), filters] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
};

// Get all devices for current user
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.lists(),
    queryFn: async (): Promise<Device[]> => {
      try {
        const data = await apiClient.get<{ devices: Device[] }>('/devices');
        return data.devices;
      } catch (error) {
        toast.error('Failed to load devices');
        Sentry.captureException(error);
        throw error;
      }
    },
  });
}

// Get single device by ID
export function useDevice(deviceId: string | null) {
  return useQuery({
    queryKey: deviceKeys.detail(deviceId!),
    queryFn: async (): Promise<Device | null> => {
      try {
        const data = await apiClient.get<{ device: Device }>(`/devices/${deviceId}`);
        return data.device ?? null;
      } catch (error) {
        toast.error('Failed to load device');
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: !!deviceId,
  });
}

// Create device mutation
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (device: DeviceInsert & { device_token: string }) => {
      const data = await apiClient.post<{ device: Device }>('/devices', device);
      return data.device;
    },
    onSuccess: (newDevice) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      toast.success(`Device ${newDevice.name} created successfully`);
    },
    onError: (error) => {
      toast.error('Failed to create device');
      Sentry.captureException(error);
    },
  });
}

// Update device mutation
export function useUpdateDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: DeviceUpdate) => {
      const data = await apiClient.patch<{ device: Device }>(
        `/devices/${deviceId}`,
        updates
      );
      return data.device;
    },
    onSuccess: (updatedDevice) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      toast.success('Device updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update device');
      Sentry.captureException(error);
    },
  });
}

// Delete device mutation
export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await apiClient.delete(`/devices/${deviceId}`);
      return deviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      toast.success('Device deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete device');
      Sentry.captureException(error);
    },
  });
}

// Pair device (mint NFT)
export function usePairDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await apiClient.post<{
        device: Device;
        mintAddress: string;
        signature: string;
      }>(`/devices/${deviceId}/pair`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      toast.success('Device paired successfully', 'NFT Minted');
    },
    onError: (error) => {
      toast.error('Failed to pair device');
      Sentry.captureException(error);
    },
  });
}

// Control relay
export function useControlRelay(deviceId: string) {
  return useMutation({
    mutationFn: async ({ channel, state }: { channel: number; state: 'on' | 'off' }) => {
      await apiClient.post(`/devices/${deviceId}/relay/${channel}/${state}`);
      return { channel, state };
    },
    onSuccess: ({ channel, state }) => {
      toast.success(`Relay ${channel} turned ${state}`);
    },
    onError: (error) => {
      toast.error('Failed to control relay');
      Sentry.captureException(error);
    },
  });
}
