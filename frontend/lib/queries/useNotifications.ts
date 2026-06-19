import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '../api/client';
import { toast } from '../toast';
import type { Notification } from '../types/database';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
};

export function useNotifications(): UseQueryResult<Notification[], Error> {
  return useQuery<Notification[]>({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      const data = await apiClient.get<{ notifications: Notification[] }>('/notifications');
      return data.notifications;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}`, { is_read: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.lists() }),
    onError: (error) => {
      toast.error('Failed to update notification');
      Sentry.captureException(error);
    },
  });
}
