"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Zap, Radio, CheckCircle2, RefreshCw, AlertOctagon, Lock, Cpu, Activity, ChevronRight } from "lucide-react";
import { StatusOrb } from "@/components/ui/StatusOrb";
import { MetricCard } from "@/components/ui/MetricCard";
import { CommandCenterButton } from "@/components/ui/CommandCenterButton";
import { VerificationLogRow } from "@/components/ui/VerificationLogRow";
import { ParticleField } from "@/components/ui/ParticleField";
import { HexGrid } from "@/components/ui/HexGrid";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { PriorityAlertModal } from "@/components/ui/PriorityAlertModal";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants, pulseNominalVariants, cardHoverVariants } from "@/lib/animations";
import Link from "next/link";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { playRelayClick, playSurgeTripSound } from "@/components/ui/TactileSound";

export default function DashboardPage() {
  const [alertOpen, setAlertOpen] = useState(false);
  const [lockdownActive, setLockdownActive] = useState(false);
  const [simulatingSurge, setSimulatingSurge] = useState(false);
  const [simVoltage, setSimVoltage] = useState(230.4);
  const [simCurrent, setSimCurrent] = useState(24.8);
  const { config } = useEnvironmentStore();

  const handleLockdown = () => {
    playSurgeTripSound();
    setAlertOpen(true);
  };

  const handleAuthorize = () => {
    playRelayClick();
    setAlertOpen(false);
    setLockdownActive(true);
    setTimeout(() => setLockdownActive(false), 5000);
  };

  const handleTriggerSimSurge = () => {
    if (simulatingSurge) return;
    playSurgeTripSound();
    setSimulatingSurge(true);
    setSimVoltage(488.2);
    setSimCurrent(48.6);

    setTimeout(() => {
      playRelayClick();
      setSimVoltage(0.0);
      setSimCurrent(0.0);
      setLockdownActive(true);
    }, 1000);

    setTimeout(() => {
      setSimulatingSurge(false);
      setSimVoltage(230.4);
      setSimCurrent(24.8);
      setLockdownActive(false);
    }, 5000);
  };

  // Environment-specific presence label
  const presenceLabel =
    config.id === "hospital" ? "patients" : config.id === "industrial" ? "personnel" : "humans";

  return (
    <>
      <motion.div
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative flex flex-col w-full px-4 pt-2 pb-8 space-y-6 overflow-hidden font-sans"
      >
        {/* Ambient background layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <HexGrid rows={8} cols={7} highlightIndices={[5, 12, 19, 26, 33]} />
          <ParticleField count={30} color="#06B6D4" speed={0.2} connected={false} />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base to-transparent" />
        </div>

        {/* Header Environment Strip */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex items-center justify-between border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]"
        >
          <div className="flex items-center gap-2">
            <span className="led-indicator led-green" />
            <span className="text-text-muted">PROFILE:</span>
            <Link href="/env-control" onClick={playRelayClick} className="text-white font-bold hover:text-accent-cyan transition-colors">
              {config.name}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-accent-cyan">10kHz TinyML</span>
            <span className="text-white/20">|</span>
            <span className="text-text-muted">SOLANA DEVNET</span>
          </div>
        </motion.div>

        {/* Central Tactical Power Radar Widget */}
        <motion.div
          className="relative flex flex-col items-center justify-center border border-white/10 bg-card p-6 shadow-2xl"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-4 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="flex items-center gap-2 text-text-secondary">
              <Activity size={14} className="text-accent-cyan" />
              [ AURA_GRID_RADAR // NODE_01 ]
            </span>
            <span className="flex items-center gap-2 font-bold">
              <span className={`led-indicator ${lockdownActive ? "led-red" : "led-green"}`} />
              <span className={lockdownActive ? "text-accent-danger" : "text-accent-cyan"}>
                {lockdownActive ? "EMERGENCY TRIP" : "NOMINAL"}
              </span>
            </span>
          </div>

          <motion.div
            variants={staggerChildVariants}
            className="relative flex items-center justify-center w-56 h-56 mb-4"
          >
            {/* Orbital Concentric Radar Rings */}
            {[0, 4, 8].map((inset, i) => (
              <motion.div
                key={i}
                className="absolute border border-accent-cyan/20"
                style={{ inset }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 25 - i * 6, repeat: Infinity, ease: "linear" }}
              />
            ))}

            {/* Glowing outer pulse */}
            <motion.div
              variants={pulseNominalVariants}
              animate="animate"
              className="absolute inset-0"
              style={{ border: lockdownActive ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(6,182,212,0.4)" }}
            />

            {/* Core Telemetry Readout */}
            <div className="z-10 flex flex-col items-center text-center font-mono">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <StatusOrb status={lockdownActive ? "threat" : "secure"} size="lg" animate />
              </motion.div>
              
              <div className="mt-3">
                <div className={`font-heading font-black text-2xl tracking-widest uppercase ${lockdownActive ? "text-accent-danger text-glow-red" : "text-accent-cyan text-glow-cyan"}`}>
                  {lockdownActive ? "TRIPPED" : `${simVoltage.toFixed(1)}V`}
                </div>
                <div className="text-[9.5px] text-text-muted tracking-[0.2em] uppercase mt-0.5">
                  {lockdownActive ? "0.04ms Cutoff Engaged" : "50.0 Hz Grid Frequency"}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Live Uplink Status Badge */}
          <motion.div
            variants={staggerChildVariants}
            className="flex items-center gap-2 border border-accent-teal/40 bg-accent-teal/10 px-4 py-1.5 font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-accent-teal"
          >
            <span className="led-indicator led-green animate-ping" />
            <Radio size={12} />
            <span>REALTIME TELEMETRY UPLINK ACTIVE</span>
          </motion.div>
        </motion.div>

        {/* Live Instrument Stats Grid */}
        <motion.div
          className="grid grid-cols-2 gap-3 font-mono"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerChildVariants}>
            <div className="border border-white/10 bg-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] text-text-muted font-bold tracking-[0.16em] uppercase">Human Presence</span>
                <CheckCircle2 size={14} className="text-accent-teal" />
              </div>
              <div className="flex items-baseline space-x-1">
                <AnimatedCounter value={3} className="text-2xl font-bold text-white num-tabular" />
                <span className="text-xs text-text-muted uppercase">{presenceLabel}</span>
              </div>
              <span className="text-[9.5px] text-accent-teal mt-1 uppercase font-bold">● All Authorized</span>
            </div>
          </motion.div>

          <motion.div variants={staggerChildVariants}>
            <div className="border border-white/10 bg-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] text-text-muted font-bold tracking-[0.16em] uppercase">Current Load</span>
                <Zap size={14} className="text-accent-warning" />
              </div>
              <div className="flex items-baseline space-x-1">
                <AnimatedCounter value={simCurrent} decimals={1} className="text-2xl font-bold text-white num-tabular" />
                <span className="text-xs text-text-muted uppercase">AMPS</span>
              </div>
              <span className="text-[9.5px] text-accent-warning mt-1 uppercase font-bold">-2.4% below threshold</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Tactical Command Center Buttons */}
        <motion.div
          className="flex flex-col space-y-3 font-mono"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-text-muted tracking-[0.22em] uppercase">[ COMMAND CONTROLS ]</h3>
            <span className="text-[9.5px] text-accent-cyan uppercase">AUTONOMOUS TRIP: READY</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleLockdown}
              className="flex flex-col items-center justify-center border-2 border-accent-danger/60 bg-accent-danger/10 p-4 text-accent-danger transition-all hover:bg-accent-danger hover:text-black active:scale-[0.98]"
            >
              <ShieldAlert size={24} className="mb-1" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]">EMERGENCY LOCKDOWN</span>
            </button>

            <button
              onClick={handleTriggerSimSurge}
              className="flex flex-col items-center justify-center border border-accent-warning/60 bg-accent-warning/10 p-4 text-accent-warning transition-all hover:bg-accent-warning hover:text-black active:scale-[0.98]"
            >
              <Zap size={24} className="mb-1" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]">SIMULATE SURGE TRIP</span>
            </button>

            <Link
              href="/devices"
              onClick={playRelayClick}
              className="col-span-2 border border-white/10 bg-black p-3.5 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-white sm:col-span-1 flex items-center justify-center gap-2"
            >
              <Cpu size={14} className="text-accent-cyan" />
              Manage {config.devicePlural}
            </Link>

            <Link
              href="/alerta"
              onClick={playRelayClick}
              className="col-span-2 border border-accent-danger/40 bg-accent-danger/10 p-3.5 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-danger transition-colors hover:bg-accent-danger hover:text-black sm:col-span-1 flex items-center justify-center gap-2"
            >
              <AlertOctagon size={14} />
              Open Alerta Hub
            </Link>
          </div>
        </motion.div>

        {/* On-Chain Verification Feed */}
        <motion.div
          className="flex flex-col space-y-3 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-text-muted tracking-[0.22em] uppercase">[ ON-CHAIN LEDGER VERIFICATION ]</h3>
            <div className="flex items-center gap-1.5 text-accent-cyan text-[9.5px] tracking-widest uppercase">
              <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
              <span>Solana Sync</span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { title: config.zones[0] + " Lock", timeAgo: "2m ago", sig: "5K7x...mQ4Z", icon: <AlertOctagon size={14} /> },
              { title: config.zones[1] + " Sweep", timeAgo: "15m ago", sig: "9xQ1...mB4v", icon: <Radio size={14} /> },
              { title: "TinyML Neural Verification", timeAgo: "1h ago", sig: "7tN5...pC8x", icon: <Zap size={14} /> },
            ].map((item, i) => (
              <div key={i} className="border border-white/10 bg-black p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan">
                    {item.icon}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase text-white tracking-[0.1em] block">
                      {item.title}
                    </span>
                    <span className="text-[9px] text-text-muted uppercase">
                      Timestamp: {item.timeAgo}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-accent-teal uppercase block">
                    VERIFIED
                  </span>
                  <span className="text-[9px] text-text-muted">
                    Tx: {item.sig}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Priority Alert Modal */}
      <PriorityAlertModal
        isOpen={alertOpen}
        title="EMERGENCY LOCKDOWN"
        description="Initiating autonomous solid-state relay isolation across all grid zones."
        location={config.name}
        onDismiss={() => setAlertOpen(false)}
        onAuthorize={handleAuthorize}
      />
    </>
  );
}
