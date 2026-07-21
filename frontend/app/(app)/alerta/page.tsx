"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants } from "@/lib/animations";
import { useThreats, useUpdateThreat } from "@/lib/queries/useThreats";
import { useDevices } from "@/lib/queries/useDevices";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import type { AlertaStatus } from "@/lib/types/database";
import { SolanaExplorerBadge } from "@/components/blockchain/SolanaExplorerBadge";

type Filter = "all" | AlertaStatus;

const SEVERITY_COLORS: Record<string, string> = {
  open: "text-red-400 bg-red-500/10 border-red-500/30",
  ack: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  closed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

const DELIVERY_CHANNELS = [
  { name: "Alerta API", icon: Activity },
  { name: "Push / FCM", icon: Bell },
  { name: "Email / Resend", icon: Zap },
  { name: "Solana Memo", icon: ShieldAlert },
];

export default function AlertaPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: devices = [] } = useDevices();
  const primaryDeviceId = devices[0]?.id ?? null;
  const { data: threats = [] } = useThreats(primaryDeviceId, 100);
  const { config } = useEnvironmentStore();
  const { mutate: updateThreat } = useUpdateThreat(primaryDeviceId);

  const filteredThreats = threats.filter((t) =>
    activeFilter === "all" ? true : t.alerta_status === activeFilter
  );

  const openCount = threats.filter((t) => t.alerta_status === "open").length;
  const ackCount = threats.filter((t) => t.alerta_status === "ack").length;
  const closedCount = threats.filter((t) => t.alerta_status === "closed").length;
  const total = threats.length || 1;
  const ackRate = Math.round((ackCount + closedCount) / total * 100);

  const sevCounts = threats.reduce(
    (acc, t) => {
      acc[t.severity] = (acc[t.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const sevTotal = threats.length || 1;
  const sevDist = [
    { label: "Critical", pct: Math.round(((sevCounts.critical ?? 0) / sevTotal) * 100), color: "bg-red-500" },
    { label: "High", pct: Math.round(((sevCounts.high ?? 0) / sevTotal) * 100), color: "bg-orange-500" },
    { label: "Medium", pct: Math.round(((sevCounts.medium ?? 0) / sevTotal) * 100), color: "bg-amber-500" },
    { label: "Low", pct: Math.round(((sevCounts.low ?? 0) / sevTotal) * 100), color: "bg-emerald-500" },
  ];

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Alerta Command Center</p>
            <h2 className="mt-3 text-3xl font-bold uppercase tracking-[0.16em] text-white">
              Real-time Alert Management
            </h2>
            <p className="mt-3 text-text-secondary">
              Unified alert routing hub — all critical {config.threatPlural.toLowerCase()} flow through Alerta before FCM and email fallback.
            </p>
          </div>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="hidden sm:flex shrink-0 mt-1 items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Live
          </motion.div>
        </div>
      </section>

      {/* ── Analytics Dashboard Row ─────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        variants={staggerParentVariants}
        initial="initial"
        animate="animate"
      >
        {[
          { label: `Open ${config.threatPlural}`, value: openCount, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "Acknowledged", value: ackCount, icon: Bell, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Resolved", value: closedCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Total Events", value: threats.length, icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        ].map((stat, index) => (
          <motion.div
            key={index}
            variants={staggerChildVariants}
            className={`panel-card rounded-[20px] p-5 border ${stat.border} ${stat.bg}`}
          >
            <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
            <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Delivery Health Grid ────────────────────────────────────── */}
      <section className="panel-card rounded-[20px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-text-muted tracking-[0.2em] uppercase">Delivery Health</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-[10px] text-accent-cyan font-bold uppercase tracking-widest"
          >
            <RefreshCw size={10} /> Refresh
          </motion.button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {DELIVERY_CHANNELS.map(({ name, icon: Icon }) => (
            <div key={name} className="rounded-xl p-3 border flex flex-col gap-2 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <Icon size={14} className="text-emerald-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[10px] font-bold text-white">{name}</p>
              <p className="text-[9px] font-mono text-text-muted">Active</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Severity Distribution ───────────────────────────────────── */}
      <section className="panel-card rounded-[20px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-text-muted tracking-[0.2em] uppercase">Severity Distribution</h3>
          <span className="text-[10px] font-mono text-text-muted">Ack rate: <span className="text-accent-cyan font-bold">{ackRate}%</span></span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
          {sevDist.map(({ label, pct, color }) => (
            <motion.div
              key={label}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full ${color}`}
              title={`${label}: ${pct}%`}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {sevDist.map(({ label, pct, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] text-text-muted">{label} <span className="text-white font-bold">{pct}%</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filter Pills ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={12} className="text-text-muted" />
        {(["all", "open", "ack", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all border ${
              activeFilter === f
                ? "bg-cyan-400/15 border-cyan-400/30 text-cyan-300"
                : "bg-white/5 border-white/10 text-text-secondary hover:bg-white/10"
            }`}
          >
            {f === "all" ? `All (${threats.length})` : `${f} (${threats.filter((t) => t.alerta_status === f).length})`}
          </button>
        ))}
      </div>

      {/* ── Notification Cards ──────────────────────────────────────── */}
      <section className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredThreats.map((threat, index) => {
            const isExpanded = expandedId === threat.id;
            const statusClass = SEVERITY_COLORS[threat.alerta_status ?? "open"];
            return (
              <motion.div
                key={threat.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.04 }}
                className="panel-card rounded-[20px] overflow-hidden"
              >
                {/* Card Header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 border ${statusClass}`}>
                        <AlertTriangle className={`h-4 w-4 ${statusClass.split(" ")[0]}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {threat.event_type.replace(/_/g, " ").toUpperCase()}
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                          {config.device} {threat.device_id} · {new Date(threat.occurred_at).toLocaleString()}
                        </p>
                        {threat.action_taken && (
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{threat.action_taken}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${statusClass}`}>
                        {threat.alerta_status}
                      </span>
                      {isExpanded
                        ? <ChevronUp size={14} className="text-text-muted" />
                        : <ChevronDown size={14} className="text-text-muted" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 space-y-4 border-t border-white/5">
                        {threat.alerta_alert_id && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Alerta ID</p>
                            <p className="text-xs font-mono text-text-secondary">{threat.alerta_alert_id}</p>
                          </div>
                        )}
                        {threat.solana_signature && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Solana Proof</p>
                            <SolanaExplorerBadge signature={threat.solana_signature} slot={threat.solana_slot} confirmed={threat.solana_confirmed} />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateThreat({ threatId: threat.id, updates: { alerta_status: 'ack' } })}
                            disabled={threat.alerta_status === 'ack'}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${
                              threat.alerta_status === 'ack'
                                ? "border-amber-400/10 bg-amber-400/5 text-amber-400/50 cursor-not-allowed"
                                : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                            }`}
                          >
                            {threat.alerta_status === 'ack' ? 'Acknowledged' : 'Acknowledge'}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateThreat({ threatId: threat.id, updates: { alerta_status: 'closed' } })}
                            disabled={threat.alerta_status === 'closed'}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${
                              threat.alerta_status === 'closed'
                                ? "border-emerald-400/10 bg-emerald-400/5 text-emerald-400/50 cursor-not-allowed"
                                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                            }`}
                          >
                            {threat.alerta_status === 'closed' ? 'Resolved' : 'Resolve'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {!filteredThreats.length && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-card rounded-[20px] p-12 text-center"
          >
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-white">All Clear</h3>
            <p className="mt-2 text-text-secondary">
              No {config.threatPlural.toLowerCase()} match your current filter
            </p>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
