'use client';

import { Activity } from 'lucide-react';
import { getLatestReading, useRealtimeStore } from '@/lib/stores/realtimeStore';
import type { SensorReading } from '@/lib/types/database';

export function TelemetryGauge({ deviceId, fallback }: { deviceId: string | null; fallback?: SensorReading | null }) {
  useRealtimeStore((state) => state.recentReadings);
  const latest = deviceId ? getLatestReading(deviceId) ?? fallback : fallback;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Live Telemetry</h2>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Gauge label="Voltage" value={latest?.voltage ?? 0} unit="V" />
        <Gauge label="Current" value={latest?.current_amps ?? 0} unit="A" />
        <Gauge label="Power" value={latest?.power_watts ?? 0} unit="W" />
      </div>
    </section>
  );
}

function Gauge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded border border-zinc-800 p-4 text-center">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-emerald-300">{Number(value).toFixed(1)}</div>
      <div className="text-xs text-zinc-500">{unit}</div>
    </div>
  );
}
