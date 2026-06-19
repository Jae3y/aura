import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { SensorReading } from '../types/database';

export const readingKeys = {
  all: ['sensor-readings'] as const,
  byDevice: (deviceId: string | null) => [...readingKeys.all, deviceId] as const,
  latest: (deviceId: string | null) => [...readingKeys.byDevice(deviceId), 'latest'] as const,
};

export function useSensorReadings(deviceId: string | null, limit = 50): UseQueryResult<SensorReading[], Error> {
  return useQuery<SensorReading[]>({
    queryKey: [...readingKeys.byDevice(deviceId), limit],
    queryFn: async () => {
      const data = await apiClient.get<{ readings: SensorReading[] }>(
        `/devices/${deviceId}/readings?limit=${limit}`
      );
      return data.readings;
    },
    enabled: Boolean(deviceId),
  });
}

export function useLatestSensorReading(deviceId: string | null): UseQueryResult<SensorReading | null, Error> {
  return useQuery<SensorReading | null>({
    queryKey: readingKeys.latest(deviceId),
    queryFn: async () => {
      const data = await apiClient.get<{ reading: SensorReading | null }>(
        `/devices/${deviceId}/readings/latest`
      );
      return data.reading;
    },
    enabled: Boolean(deviceId),
    refetchInterval: 5000,
  });
}
