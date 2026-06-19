import { Cpu } from 'lucide-react';
import type { Device } from '@/lib/types/database';

export function DeviceStatusCard({ device }: { device: Device }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{device.name}</h3>
            <p className="text-sm text-zinc-500">{device.location_label ?? device.environment_type}</p>
          </div>
        </div>
        <span className={`rounded border px-2 py-1 text-xs ${device.is_online ? 'border-emerald-500/30 text-emerald-300' : 'border-red-500/30 text-red-300'}`}>
          {device.is_online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase text-zinc-500">Last Seen</div>
          <div className="mt-1 text-zinc-200">{device.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Never'}</div>
        </div>
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase text-zinc-500">Relay State</div>
          <div className="mt-1 text-zinc-200">Ready</div>
        </div>
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase text-zinc-500">Firmware</div>
          <div className="mt-1 text-zinc-200">{device.firmware_version}</div>
        </div>
        <div className="rounded border border-zinc-800 p-3">
          <div className="text-xs uppercase text-zinc-500">Threshold</div>
          <div className="mt-1 text-zinc-200">{device.voltage_threshold_min}-{device.voltage_threshold_max}V</div>
        </div>
      </div>
    </article>
  );
}
