'use client';

import { useRealtimeStore } from '@/lib/stores/realtimeStore';

export function ConnectionStatus() {
  const { isConnected } = useRealtimeStore();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        isConnected
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span>{isConnected ? 'Live' : 'Disconnected'}</span>
    </div>
  );
}
