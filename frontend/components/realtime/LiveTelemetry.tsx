'use client';

import { useEffect, useState } from 'react';
import { getLatestReading } from '@/lib/stores/realtimeStore';

interface LiveTelemetryProps {
  deviceId: string;
}

export function LiveTelemetry({ deviceId }: LiveTelemetryProps) {
  const [reading, setReading] = useState(getLatestReading(deviceId));

  // Update reading every second to catch new data
  useEffect(() => {
    const interval = setInterval(() => {
      const latest = getLatestReading(deviceId);
      if (latest && latest.id !== reading?.id) {
        setReading(latest);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deviceId, reading]);

  if (!reading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Waiting for sensor data...</p>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Voltage',
      value: reading.voltage.toFixed(2),
      unit: 'V',
      color: 'text-blue-400',
    },
    {
      label: 'Current',
      value: reading.current_amps.toFixed(2),
      unit: 'A',
      color: 'text-green-400',
    },
    {
      label: 'Power',
      value: reading.power_watts.toFixed(2),
      unit: 'W',
      color: 'text-yellow-400',
    },
    {
      label: 'Frequency',
      value: reading.frequency.toFixed(2),
      unit: 'Hz',
      color: 'text-purple-400',
    },
    {
      label: 'Power Factor',
      value: reading.power_factor.toFixed(2),
      unit: '',
      color: 'text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-black/50 border border-gray-800 rounded-lg p-4"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            {metric.label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
            {metric.unit && (
              <span className="text-sm text-gray-400">{metric.unit}</span>
            )}
          </div>
        </div>
      ))}

      {/* Energy counter */}
      <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Energy
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-emerald-400">
            {reading.energy_kwh.toFixed(3)}
          </span>
          <span className="text-sm text-gray-400">kWh</span>
        </div>
      </div>

      {/* Anomaly indicator */}
      {reading.is_anomaly && (
        <div className="col-span-full bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium">Anomaly detected in readings</span>
          </div>
        </div>
      )}
    </div>
  );
}
