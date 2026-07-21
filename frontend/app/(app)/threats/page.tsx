"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants } from "@/lib/animations";
import { useThreats } from "@/lib/queries/useThreats";
import { useDevices } from "@/lib/queries/useDevices";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { useState } from "react";
import type { AlertaStatus } from "@/lib/types/database";

type Filter = "all" | AlertaStatus;

export default function ThreatsPage() {
  const { config } = useEnvironmentStore();
  const { data: devices = [] } = useDevices();
  const deviceId = devices[0]?.id ?? "1";
  const { data: threats = [] } = useThreats(deviceId, 100);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = threats.filter((t) => filter === "all" || t.alerta_status === filter);

  const openCount = threats.filter((t) => t.alerta_status === "open").length;
  const ackCount = threats.filter((t) => t.alerta_status === "ack").length;
  const closedCount = threats.filter((t) => t.alerta_status === "closed").length;

  const severityColor = (status: string) => {
    if (status === "open") return "text-red-400 bg-red-500/10 border-red-500/30";
    if (status === "ack") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Header */}
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">{config.name}</p>
            <h2 className="mt-3 text-3xl font-bold uppercase tracking-[0.16em] text-white">
              {config.id === "home" ? "Threat Center" : config.id === "hospital" ? "Code Queue" : "Incident Queue"}
            </h2>
            <p className="mt-3 text-text-secondary">
              Active security {config.threatPlural.toLowerCase()} routed through Alerta — acknowledge, resolve, or escalate.
            </p>
          </div>
          {/* Environment badge */}
          <span className={`shrink-0 mt-1 hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
            <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-current" />
            {config.shortName}
          </span>
        </div>
      </section>

      {/* Stats Row */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={staggerParentVariants}
        initial="initial"
        animate="animate"
      >
        {[
          { label: `Open ${config.threatPlural}`, value: openCount, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: ShieldAlert },
          { label: "Acknowledged", value: ackCount, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "Resolved", value: closedCount, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <motion.div key={label} variants={staggerChildVariants} className={`panel-card rounded-xl p-4 border ${border} ${bg}`}>
            <Icon className={`h-6 w-6 ${color} mb-2`} />
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mt-1">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "ack", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all border ${
              filter === f
                ? "bg-cyan-400/15 border-cyan-400/30 text-cyan-300"
                : "bg-white/5 border-white/10 text-text-secondary hover:bg-white/10"
            }`}
          >
            {f === "all" ? `All ${config.threatPlural}` : f}
          </button>
        ))}
      </div>

      {/* Threat Cards */}
      <section className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((threat, index) => {
            const isExpanded = expandedId === threat.id;
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
                <button
                  onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${severityColor(threat.alerta_status ?? "open").split(" ").slice(1).join(" ")}`}>
                        <AlertTriangle className={`h-4 w-4 ${severityColor(threat.alerta_status ?? "open").split(" ")[0]}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {threat.event_type.replace(/_/g, " ").toUpperCase()}
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                          {config.device} {threat.device_id} · {new Date(threat.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${severityColor(threat.alerta_status ?? "open")}`}>
                        {threat.alerta_status}
                      </span>
                      {isExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 space-y-4 border-t border-white/5">
                        {threat.action_taken && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">Action Taken</p>
                            <p className="text-sm text-text-secondary">{threat.action_taken}</p>
                          </div>
                        )}
                        {threat.solana_signature && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">Solana Signature</p>
                            <a
                              href={`https://explorer.solana.com/tx/${threat.solana_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-mono text-accent-cyan hover:underline"
                            >
                              {threat.solana_signature.slice(0, 20)}…
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button className="px-4 py-2 rounded-lg text-xs font-bold uppercase border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors">
                            Acknowledge
                          </button>
                          <button className="px-4 py-2 rounded-lg text-xs font-bold uppercase border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors">
                            Resolve
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-card rounded-[20px] p-12 text-center"
          >
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-white">All Clear</h3>
            <p className="mt-2 text-text-secondary">
              No {config.threatPlural.toLowerCase()} match the current filter
            </p>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
