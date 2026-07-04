"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Server, CheckCircle2, Wifi, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";
import { useEnvironmentStore, ENVIRONMENT_CONFIGS, type EnvironmentMode } from "@/lib/stores/environmentStore";
import Link from "next/link";

const ENV_ICONS = {
  home: Globe,
  hospital: ShieldCheck,
  industrial: Server,
};

export default function EnvControlPage() {
  const { mode: activeEnv, config, setMode } = useEnvironmentStore();
  const [pendingEnv, setPendingEnv] = useState<EnvironmentMode | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSelect = (id: EnvironmentMode) => {
    if (id === activeEnv) return;
    setPendingEnv(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (pendingEnv) setMode(pendingEnv);
    setShowConfirm(false);
    setPendingEnv(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingEnv(null);
  };

  const environments = Object.values(ENVIRONMENT_CONFIGS);

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8"
    >
      {/* Header */}
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <p className="section-label">Environment Control</p>
        <h2 className="mt-4 text-3xl font-bold uppercase tracking-[0.16em] text-white">
          Select Operational Mode
        </h2>
        <p className="mt-4 text-text-secondary">
          Choose the environment type to optimize security, automation, and monitoring
          parameters for your specific use case. Changes persist across sessions.
        </p>
        {/* Active badge */}
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
          <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-current" />
          Active: {config.name}
        </div>
      </section>

      {/* Environment Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {environments.map((env, index) => {
          const Icon = ENV_ICONS[env.id];
          const isActive = activeEnv === env.id;
          return (
            <motion.button
              key={env.id}
              whileHover={{ scale: isActive ? 1 : 1.02 }}
              whileTap={{ scale: isActive ? 1 : 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(env.id)}
              className={`panel-card rounded-[24px] p-6 text-left transition-all relative overflow-hidden ${
                isActive ? `${env.badgeBg} ${env.badgeBorder} border` : "border border-transparent hover:border-white/10"
              }`}
            >
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-0 right-0 w-24 h-24 rounded-bl-full blur-2xl opacity-20"
                  style={{ background: "currentColor" }}
                />
              )}
              <div className="flex items-center justify-between">
                <Icon className={`h-10 w-10 ${env.badgeColor}`} />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`h-5 w-5 rounded-full flex items-center justify-center ${env.badgeBg} ${env.badgeBorder} border`}
                  >
                    <div className={`w-2 h-2 rounded-full ${env.badgeColor.replace("text-", "bg-")}`} />
                  </motion.div>
                )}
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{env.name}</h3>
              <p className="mt-2 text-sm text-text-secondary">{env.name} — optimized for {env.detectionMode.toLowerCase()} operations</p>
              <div className="mt-4 space-y-1">
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{env.device} · {env.zone} · {env.threat}</p>
              </div>
            </motion.button>
          );
        })}
      </section>

      {/* Current Config Detail */}
      <motion.section
        key={activeEnv}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="panel-card rounded-[24px] p-6"
      >
        <h3 className="text-lg font-bold text-white mb-6">
          Current Configuration — <span className={config.badgeColor}>{config.name}</span>
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Security Level", icon: Lock, value: activeEnv === "hospital" ? "Maximum" : activeEnv === "industrial" ? "High" : "Standard", color: "text-emerald-400" },
            { label: "Network Mode", icon: Wifi, value: activeEnv === "home" ? "WiFi Only" : "Dual Stack", color: "text-cyan-400" },
            { label: "Voltage Range", icon: Server, value: config.voltageRange, color: "text-orange-400" },
            { label: "Detection Mode", icon: Globe, value: config.detectionMode, color: "text-purple-400" },
            { label: "Alert Channels", icon: AlertTriangle, value: config.alertChannels, color: "text-amber-400" },
            { label: "Terminology", icon: ShieldCheck, value: `${config.device} · ${config.zone} · ${config.threat}`, color: "text-text-secondary" },
          ].map(({ label, icon: Icon, value, color }) => (
            <div key={label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">{label}</p>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-white">{value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted mb-2">Active Zones</p>
          <div className="flex flex-wrap gap-2">
            {config.zones.map((zone) => (
              <span key={zone} className={`px-3 py-1 rounded-full text-xs font-bold ${config.badgeBg} ${config.badgeBorder} border ${config.badgeColor}`}>
                {zone}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && pendingEnv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
            >
              <AlertTriangle className="h-10 w-10 text-amber-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Switch Environment?</h3>
              <p className="text-sm text-text-secondary mb-6">
                Switching to <span className="font-bold text-white">{ENVIRONMENT_CONFIGS[pendingEnv].name}</span> will
                update all terminology, zone names, thresholds, and monitoring labels across the entire platform.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-800 text-text-secondary text-xs font-bold uppercase hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition-colors ${ENVIRONMENT_CONFIGS[pendingEnv].badgeBg} ${ENVIRONMENT_CONFIGS[pendingEnv].badgeBorder} border ${ENVIRONMENT_CONFIGS[pendingEnv].badgeColor} hover:opacity-80`}
                >
                  Confirm Switch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
