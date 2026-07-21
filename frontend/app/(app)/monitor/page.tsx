"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, AlertTriangle, Fingerprint, Zap, Volume2 } from "lucide-react";
import { GlitchText } from "@/components/ui/GlitchText";
import { ParticleField } from "@/components/ui/ParticleField";
import { ScanLine } from "@/components/ui/ScanLine";
import { CommandCenterButton } from "@/components/ui/CommandCenterButton";
import { RadarSweep } from "@/components/ui/RadarSweep";
import { pageTransitionVariants, pulseAlertVariants } from "@/lib/animations";
import { useThreats } from "@/lib/queries/useThreats";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

export default function ThreatMonitorPage() {
  const [countdown, setCountdown] = useState(42 * 60 + 12);
  const { data: threats = [] } = useThreats("1", 100);
  const activeThreat = threats.find((threat) => threat.alerta_status === "open") || threats[0];
  const { config } = useEnvironmentStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  // Environment-specific labels
  const monitorTitle =
    config.id === "hospital"
      ? "Hospital Threat Monitor"
      : config.id === "industrial"
      ? "Industrial Incident Monitor"
      : "Threat Monitor";

  const subjectLabel =
    config.id === "hospital"
      ? "UNKNOWN PATIENT"
      : config.id === "industrial"
      ? "UNKNOWN PERSONNEL"
      : "UNKNOWN SUBJECT";

  const responseLabel1 = config.id === "industrial" ? "Site Siren" : "External Siren";
  const responseLabel2 = config.id === "hospital" ? "Code Lights" : config.id === "industrial" ? "Zone Isolation" : "Floodlights";

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex flex-col w-full h-full px-4 pt-4 pb-8 overflow-hidden"
    >
      {/* Environment badge */}
      <div className={`mb-4 self-start flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-current" />
        {monitorTitle}
      </div>

      {/* Red particle field background */}
      <div className="absolute inset-0 pointer-events-none">
        <ParticleField count={40} color="#06B6D4" speed={0.5} connected />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-accent-cyan/10 pointer-events-none" />
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {activeThreat && (
          <motion.div
            key="alert-banner"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-full bg-accent-danger/10 border border-accent-danger rounded-xl p-4 flex items-start space-x-4 mb-6 overflow-hidden"
          >
            <ScanLine color="#EF4444" />
            <motion.div
              variants={pulseAlertVariants}
              animate="animate"
              className="rounded-full p-2 bg-accent-danger/20 text-accent-danger shrink-0"
            >
              <ShieldAlert size={22} />
            </motion.div>
            <div>
              <GlitchText
                text={activeThreat.event_type.replace("_", " ").toUpperCase()}
                color="red"
                size="md"
              />
              <div className="text-xs font-mono text-accent-danger/80 bg-accent-danger/20 px-2 py-0.5 rounded border border-accent-danger/30 uppercase tracking-wider inline-block mt-2">
                {config.device} {activeThreat.device_id} · {activeThreat.action_taken ?? "Response pending"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Sensor Visualization */}
      <motion.div
        className="relative flex flex-col items-center justify-center min-h-[200px] mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <RadarSweep />
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="mt-4 text-[9px] text-accent-cyan font-mono tracking-[0.3em] uppercase"
        >
          ● Live Sensor Feed Active
        </motion.div>
      </motion.div>

      {/* Auto-Response Protocol */}
      <motion.div
        className="w-full mb-5"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="bg-card border border-accent-danger/30 rounded-xl p-4 relative overflow-hidden">
          <ScanLine color="#EF4444" />
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase">
              Auto-Response Protocol
            </div>
            <div className="text-2xl font-mono text-white font-bold tabular-nums">
              {mm}:{ss}
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-accent-danger rounded-full"
              animate={{
                boxShadow: ["0 0 4px rgba(239,68,68,0.5)", "0 0 12px rgba(239,68,68,1)", "0 0 4px rgba(239,68,68,0.5)"],
              }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: `${(countdown / (42 * 60 + 12)) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center space-x-2 mt-2 bg-accent-warning/10 border border-accent-warning/30 rounded py-1">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <AlertTriangle size={11} className="text-accent-warning" />
            </motion.div>
            <span className="text-[9px] text-accent-warning font-mono tracking-widest uppercase">
              Solana Verification Pending
            </span>
          </div>
        </div>
      </motion.div>

      {/* Info List */}
      <motion.div
        className="w-full bg-card border border-zinc-800 rounded-xl p-4 mb-5 space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[
          { icon: <Fingerprint size={14} />, label: "Identity", value: subjectLabel, valueColor: "text-white" },
          { icon: <Zap size={14} />, label: "Confidence", value: "92.4%", valueColor: "text-accent-warning" },
        ].map((item, i) => (
          <div key={i}>
            {i > 0 && <div className="h-px w-full bg-zinc-800" />}
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center text-text-muted text-[10px] font-bold tracking-wider uppercase space-x-2">
                <span className="text-text-secondary">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <div className={`text-sm font-mono font-bold ${item.valueColor}`}>{item.value}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Response Options */}
      <motion.div
        className="grid grid-cols-2 gap-4 mt-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 250 }}
      >
        <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}>
          <CommandCenterButton
            label={responseLabel1}
            icon={<Volume2 size={22} />}
            variant="red"
            className="h-20 w-full"
          />
        </motion.div>
        <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}>
          <CommandCenterButton
            label={responseLabel2}
            icon={<Zap size={22} />}
            variant="cyan"
            className="h-20 w-full"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
