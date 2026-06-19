'use client';

import { useRealtimeStore } from '@/lib/stores/realtimeStore';
import { formatRelativeTime, getSeverityColor } from '@/lib/utils';

export function RecentThreats({ limit = 5 }: { limit?: number }) {
  const { recentThreats } = useRealtimeStore();
  const threats = recentThreats.slice(0, limit);

  if (threats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No threat events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threats.map((threat) => (
        <div
          key={threat.id}
          className="flex items-start gap-3 p-3 bg-black/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
        >
          {/* Severity indicator */}
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              threat.severity === 'critical'
                ? 'bg-red-500'
                : threat.severity === 'high'
                ? 'bg-orange-500'
                : threat.severity === 'medium'
                ? 'bg-amber-500'
                : 'bg-yellow-500'
            } ${threat.solana_confirmed ? 'animate-pulse' : ''}`}
          />

          {/* Threat info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${getSeverityColor(
                  threat.severity
                )}`}
              >
                {threat.severity.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(threat.occurred_at)}
              </span>
            </div>
            
            <p className="text-sm text-white mb-1">{threat.action_taken ?? threat.event_type.replace('_', ' ')}</p>
            
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{threat.event_type}</span>
              {threat.voltage_at_event != null && <span>• {threat.voltage_at_event}V</span>}
              {threat.solana_confirmed && (
                <span className="text-green-500">• ✓ Blockchain verified</span>
              )}
              {!threat.solana_confirmed && threat.solana_signature && (
                <span className="text-amber-500">• ⏳ Confirming...</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
