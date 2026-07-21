import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '../api/client';
import { toast } from '../toast';
import type { ThreatEvent } from '../types/database';

export const threatKeys = {
  all: ['threats'] as const,
  byDevice: (deviceId: string | null) => [...threatKeys.all, deviceId] as const,
};

export function useThreats(deviceId: string | null, limit = 100): UseQueryResult<ThreatEvent[], Error> {
  return useQuery<ThreatEvent[]>({
    queryKey: [...threatKeys.byDevice(deviceId), limit],
    queryFn: async () => {
      const data = await apiClient.get<{ threats: ThreatEvent[] }>(
        `/devices/${deviceId}/threats?limit=${limit}`
      );
      return data.threats;
    },
    enabled: Boolean(deviceId),
    refetchInterval: 15000,
  });
}

export function useUpdateThreat(deviceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threatId, updates }: { threatId: string; updates: Partial<ThreatEvent> }) => {
      const data = await apiClient.patch<{ threat: ThreatEvent }>(`/threats/${threatId}`, updates);
      return data.threat;
    },
    onSuccess: () => {
      if (deviceId) queryClient.invalidateQueries({ queryKey: threatKeys.byDevice(deviceId) });
      toast.success('Threat updated');
    },
    onError: (error) => {
      toast.error('Failed to update threat');
      Sentry.captureException(error);
    },
  });
}
