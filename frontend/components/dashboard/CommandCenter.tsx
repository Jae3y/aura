'use client';

import { motion } from 'framer-motion';
import { Shield, Wifi } from 'lucide-react';
import { useDevices } from '@/lib/queries/useDevices';
import { useLatestSensorReading } from '@/lib/queries/useSensorReadings';
import { useThreats } from '@/lib/queries/useThreats';
import { useRealtimeStore } from '@/lib/stores/realtimeStore';
import { DeviceStatusCard } from './DeviceStatusCard';
import { EventFeed } from './EventFeed';
import { TelemetryGauge } from './TelemetryGauge';
import { AlertaStatusPanel } from './AlertaStatusPanel';

export function CommandCenter() {
  const { data: devices = [] } = useDevices();
  const selectedDevice = devices[0] ?? null;
  const { data: latest } = useLatestSensorReading(selectedDevice?.id ?? null);
  const { data: threats = [] } = useThreats(selectedDevice?.id ?? null, 10);
  const isConnected = useRealtimeStore((state) => state.isConnected);
  const online = devices.filter((device) => device.is_online).length;

  return (
    <motion.main
      className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Shield className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider">AURA Command Center</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Operations Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
          <Wifi className={`h-4 w-4 ${isConnected ? 'text-emerald-300' : 'text-amber-300'}`} />
          {isConnected ? 'Realtime linked' : 'Realtime standby'}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Devices Online" value={`${online}/${devices.length}`} accent="text-emerald-300" />
        <Metric label="Open Threats" value={threats.filter((event) => event.alerta_status === 'open').length} accent="text-red-300" />
        <Metric label="Solana Events" value={threats.filter((event) => event.solana_signature).length} accent="text-sky-300" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {devices.map((device) => (
              <DeviceStatusCard key={device.id} device={device} />
            ))}
            {devices.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
                No AURA devices are registered yet.
              </div>
            ) : null}
          </div>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Event Feed</h2>
            <EventFeed events={threats} />
          </section>
        </div>
        <div className="space-y-4">
          <TelemetryGauge deviceId={selectedDevice?.id ?? null} fallback={latest} />
          <AlertaStatusPanel deviceId={selectedDevice?.id ?? null} />
        </div>
      </section>
    </motion.main>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
