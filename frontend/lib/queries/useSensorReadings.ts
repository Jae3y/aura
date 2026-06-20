import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { SensorReading } from '../types/database';
import { mockSensorReadings } from '../mock-data';

export const readingKeys = {
  all: ['sensor-readings'] as const,
  byDevice: (deviceId: string | null) => [...readingKeys.all, deviceId] as const,
  latest: (deviceId: string | null) => [...readingKeys.byDevice(deviceId), 'latest'] as const,
};

export function useSensorReadings(deviceId: string | null, limit = 50, useMockData = false): UseQueryResult<SensorReading[], Error> {
  return useQuery<SensorReading[]>({
    queryKey: [...readingKeys.byDevice(deviceId), limit],
    queryFn: async () => {
      if (useMockData) {
        return mockSensorReadings as unknown as SensorReading[];
      }
      try {
        const data = await apiClient.get<{ readings: SensorReading[] }>(
          `/devices/${deviceId}/readings?limit=${limit}`
        );
        return data.readings;
      } catch (error) {
        console.log('Using mock sensor data');
        return mockSensorReadings as unknown as SensorReading[];
      }
    },
    enabled: Boolean(deviceId) || useMockData,
  });
}

export function useLatestSensorReading(deviceId: string | null, useMockData = false): UseQueryResult<SensorReading | null, Error> {
  return useQuery<SensorReading | null>({
    queryKey: readingKeys.latest(deviceId),
    queryFn: async () => {
      if (useMockData) {
        return mockSensorReadings[0] as unknown as SensorReading;
      }
      try {
        const data = await apiClient.get<{ reading: SensorReading | null }>(
          `/devices/${deviceId}/readings/latest`
        );
        return data.reading;
      } catch (error) {
        console.log('Using mock latest sensor data');
        return mockSensorReadings[0] as unknown as SensorReading;
      }
    },
    enabled: Boolean(deviceId) || useMockData,
    refetchInterval: 5000,
  });
}
