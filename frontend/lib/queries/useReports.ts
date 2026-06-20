import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '../api/client';
import { toast } from '../toast';
import type { MonthlyReport } from '../types/database';
import { mockReports } from '../mock-data';
import { config } from '../config';

export const reportKeys = {
  all: ['reports'] as const,
  byDevice: (deviceId: string | null) => [...reportKeys.all, deviceId] as const,
};

export function useReports(deviceId: string | null): UseQueryResult<MonthlyReport[], Error> {
  return useQuery<MonthlyReport[]>({
    queryKey: reportKeys.byDevice(deviceId),
    queryFn: async () => {
      if (config.features.mockData) {
        return mockReports as unknown as MonthlyReport[];
      }
      try {
        const data = await apiClient.get<{ reports: MonthlyReport[] }>(`/devices/${deviceId}/reports`);
        return data.reports;
      } catch (error) {
        console.log('Using mock report data');
        return mockReports as unknown as MonthlyReport[];
      }
    },
    enabled: Boolean(deviceId) || config.features.mockData,
  });
}

export function useGenerateReport(deviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportMonth: string) => {
      const data = await apiClient.post<{ report: MonthlyReport }>(`/devices/${deviceId}/reports`, {
        report_month: reportMonth,
      });
      return data.report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.byDevice(deviceId) });
      toast.success('Monthly report generated');
    },
    onError: (error) => {
      toast.error('Failed to generate report');
      Sentry.captureException(error);
    },
  });
}
