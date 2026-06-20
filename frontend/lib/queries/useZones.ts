import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '../api/client';
import { toast } from '../toast';
import type { Zone } from '../types/database';
import { mockZones } from '../mock-data';
import { config } from '../config';

export const zoneKeys = {
  all: ['zones'] as const,
  byDevice: (deviceId: string | null) => [...zoneKeys.all, deviceId] as const,
};

export function useZones(deviceId: string | null): UseQueryResult<Zone[], Error> {
  return useQuery<Zone[]>({
    queryKey: zoneKeys.byDevice(deviceId),
    queryFn: async () => {
      if (config.features.mockData) {
        return mockZones.filter((zone) => zone.device_id === deviceId) as unknown as Zone[];
      }
      try {
        const data = await apiClient.get<{ zones: Zone[] }>(`/devices/${deviceId}/zones`);
        return data.zones;
      } catch (error) {
        console.log('Using mock zone data');
        return mockZones.filter((zone) => zone.device_id === deviceId) as unknown as Zone[];
      }
    },
    enabled: Boolean(deviceId) || config.features.mockData,
  });
}

export function useCreateZone(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: Partial<Zone>) => {
      const data = await apiClient.post<{ zone: Zone }>(`/devices/${deviceId}/zones`, zone);
      return data.zone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.byDevice(deviceId) });
      toast.success('Zone saved');
    },
    onError: (error) => {
      toast.error('Failed to save zone');
      Sentry.captureException(error);
    },
  });
}

export function useUpdateZone(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ zoneId, updates }: { zoneId: string; updates: Partial<Zone> }) => {
      const data = await apiClient.patch<{ zone: Zone }>(`/zones/${zoneId}`, updates);
      return data.zone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.byDevice(deviceId) });
      toast.success('Zone updated');
    },
    onError: (error) => {
      toast.error('Failed to update zone');
      Sentry.captureException(error);
    },
  });
}
