// Alerta v2 — Encrisoft notification routing (Telegram).
// No alert lifecycle. Queries local threat events that triggered notifications.
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type { ThreatEvent } from '@/lib/types/database';

// Returns threat events that had an Alerta Telegram notification sent.
export function useAlertaNotifications(deviceId: string | null) {
  return useQuery({
    queryKey: ['alerta-notifications', deviceId],
    queryFn: async () => {
      const data = await apiClient.get<{ notifications: ThreatEvent[] }>(
        `/alerta/notifications/${deviceId}`
      );
      return data.notifications;
    },
    enabled: Boolean(deviceId),
    refetchInterval: 10000,
  });
}

// Sends a test Telegram notification for a device.
export function useTestAlertaNotification(deviceId: string | null) {
  return useMutation({
    mutationFn: async () => {
      const data = await apiClient.post<{ ok: boolean; requestRef?: string; sentAt?: string }>(
        `/alerta/test/${deviceId}`,
        {}
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test notification sent — ref: ${data.requestRef ?? 'ok'}`);
    },
    onError: (error) => {
      toast.error('Failed to send test notification — check Alerta credentials');
      Sentry.captureException(error);
    },
  });
}
