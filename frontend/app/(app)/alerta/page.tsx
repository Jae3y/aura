"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";
import { useThreats } from "@/lib/queries/useThreats";

export default function AlertaPage() {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "open" | "acknowledged" | "closed"
  >("all");
  const { data: threats = [] } = useThreats("1", 100, true);

  const filteredThreats = threats.filter((threat) => {
    if (activeFilter === "all") return true;
    // @ts-ignore
    return threat.status === activeFilter;
  });

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8"
    >
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <p className="section-label">Alerta Monitoring</p>
        <h2 className="mt-4 text-3xl font-bold uppercase tracking-[0.16em] text-white">
          Real-time Alert Management
        </h2>
        <p className="mt-4 text-text-secondary">
          View, acknowledge, and resolve security alerts from all connected systems
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Open Alerts",
            value: threats.filter((t: any) => t.status === "open").length.toString(),
            icon: AlertTriangle,
            color: "text-red-400",
          },
          {
            label: "Acknowledged",
            value: threats.filter((t: any) => t.status === "acknowledged").length.toString(),
            icon: Bell,
            color: "text-orange-400",
          },
          {
            label: "Resolved Today",
            value: "12",
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Avg Response Time",
            value: "2:34",
            icon: Activity,
            color: "text-cyan-400",
          },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="panel-card rounded-[24px] p-6"
          >
            <stat.icon className={`h-10 w-10 mb-4 ${stat.color}`} />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        {(["all", "open", "acknowledged", "closed"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.22em] transition-all ${
              activeFilter === filter
                ? "bg-cyan-400/20 border border-cyan-400/30 text-cyan-400"
                : "bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {filteredThreats.map((threat: any, index) => (
          <motion.div
            key={threat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="panel-card rounded-[24px] p-6 flex items-start gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {threat.type.replace("_", " ")}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {threat.description}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    Source: {threat.source} •{" "}
                    {new Date(threat.occurred_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                      threat.status === "open"
                        ? "bg-red-500/20 text-red-400"
                        : threat.status === "acknowledged"
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {threat.status}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {!filteredThreats.length && (
          <div className="panel-card rounded-[24px] p-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h3 className="mt-4 text-lg font-bold text-white">All Clear</h3>
            <p className="mt-2 text-text-secondary">
              No alerts match your current filter
            </p>
          </div>
        )}
      </section>
    </motion.div>
  );
}
