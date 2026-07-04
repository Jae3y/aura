"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Zap, Radio, CheckCircle2, RefreshCw, AlertOctagon } from "lucide-react";
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

export default function DashboardPage() {
  const [alertOpen, setAlertOpen] = useState(false);
  const [lockdownActive, setLockdownActive] = useState(false);
  const { config } = useEnvironmentStore();

  const handleLockdown = () => setAlertOpen(true);
  const handleAuthorize = () => {
    setAlertOpen(false);
    setLockdownActive(true);
    setTimeout(() => setLockdownActive(false), 5000);
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
        className="relative flex flex-col w-full px-4 pt-2 pb-8 space-y-5 overflow-hidden"
      >
        {/* Ambient background layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <HexGrid rows={8} cols={7} highlightIndices={[5, 12, 19, 26, 33]} />
          <ParticleField count={35} color="#06B6D4" speed={0.3} connected={false} />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base to-transparent" />
        </div>

        {/* Environment Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Link href="/env-control">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest border transition-opacity hover:opacity-80 ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-current" />
              {config.name}
            </span>
          </Link>
        </motion.div>

        {/* Central Status Widget */}
        <motion.div
          className="relative flex flex-col items-center justify-center py-5"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div
            variants={staggerChildVariants}
            className="relative flex items-center justify-center w-52 h-52 mb-4"
          >
            {/* Concentric ring system */}
            {[0, 2, 4].map((inset, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-zinc-800"
                style={{ inset }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 30 - i * 8, repeat: Infinity, ease: "linear" }}
              />
            ))}

            {/* Glowing cyan ring */}
            <motion.div
              variants={pulseNominalVariants}
              animate="animate"
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid rgba(6,182,212,0.4)" }}
            />

            {/* Inner content */}
            <div className="z-10 flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <StatusOrb status={lockdownActive ? "threat" : "secure"} size="lg" animate />
              </motion.div>
              <div className="mt-3 text-center">
                <div className={`font-heading font-bold text-xl tracking-widest uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] ${lockdownActive ? "text-accent-danger" : "text-accent-cyan"}`}>
                  {lockdownActive ? "LOCKDOWN" : "Nominal"}
                </div>
                <div className="text-[10px] font-mono text-text-muted tracking-widest uppercase mt-1">
                  System Status
                </div>
              </div>
            </div>
          </motion.div>

          {/* Live uplink badge */}
          <motion.div
            variants={staggerChildVariants}
            className="flex items-center space-x-2 text-accent-teal bg-accent-teal/10 px-4 py-1.5 rounded-full border border-accent-teal/30 backdrop-blur-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-accent-teal"
            />
            <Radio size={12} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Live Uplink Active</span>
          </motion.div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerChildVariants}>
            <motion.div
              variants={cardHoverVariants}
              initial="rest"
              whileHover="hover"
              className="bg-card border border-zinc-800 rounded-xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase">Presence</span>
                <CheckCircle2 size={14} className="text-accent-teal" />
              </div>
              <div className="flex items-baseline space-x-1">
                <AnimatedCounter value={3} className="text-2xl font-mono font-bold text-white" />
                <span className="text-xs text-text-muted font-mono uppercase">{presenceLabel}</span>
              </div>
              <span className="text-[10px] text-accent-teal font-mono mt-1">All Authorized</span>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerChildVariants}>
            <motion.div
              variants={cardHoverVariants}
              initial="rest"
              whileHover="hover"
              className="bg-card border border-zinc-800 rounded-xl p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase">Load</span>
                <Zap size={14} className="text-accent-warning" />
              </div>
              <div className="flex items-baseline space-x-1">
                <AnimatedCounter value={24.8} decimals={1} className="text-2xl font-mono font-bold text-white" />
                <span className="text-xs text-text-muted font-mono uppercase">amps</span>
              </div>
              <span className="text-[10px] text-accent-warning font-mono mt-1">-2.4% from avg</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Command Center */}
        <motion.div
          className="flex flex-col space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <h3 className="text-[10px] font-bold text-text-muted tracking-[0.2em] uppercase">Command Center</h3>
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
              <CommandCenterButton
                label="Emergency Lockdown"
                icon={
                  <motion.div
                    animate={lockdownActive ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <ShieldAlert size={26} />
                  </motion.div>
                }
                variant="red"
                onClick={handleLockdown}
                className="w-full h-20"
              />
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}>
              <CommandCenterButton
                label="Operational Lights"
                icon={<Zap size={26} />}
                variant="cyan"
                className="w-full h-20"
              />
            </motion.div>
            <Link href="/devices" className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:bg-white/10 hover:text-white sm:col-span-1">
              Manage {config.devicePlural}
            </Link>
            <Link href="/alerta" className="col-span-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-red-200 transition-colors hover:bg-red-400/20 sm:col-span-1">
              Open Alerta
            </Link>
          </div>
        </motion.div>

        {/* On-Chain Verification Feed */}
        <motion.div
          className="flex flex-col space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-text-muted tracking-[0.2em] uppercase">On-Chain Verification</h3>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-1 text-accent-cyan text-[9px] font-mono tracking-widest uppercase"
            >
              <RefreshCw size={10} />
              <span>Live Sync</span>
            </motion.div>
          </div>
          <motion.div
            className="space-y-3"
            variants={staggerParentVariants}
            initial="initial"
            animate="animate"
          >
            {[
              { title: config.zones[0] + " Lock", timeAgo: "2m ago", sig: "4vJ9...kL2p", icon: <AlertOctagon size={14} /> },
              { title: config.zones[1] + " Sweep", timeAgo: "15m ago", sig: "9xQ1...mB4v", icon: <Radio size={14} /> },
              { title: "Climate Routine", timeAgo: "1h ago", sig: "7tN5...pC8x", icon: <Zap size={14} /> },
            ].map((item, i) => (
              <motion.div key={i} variants={staggerChildVariants}>
                <VerificationLogRow
                  title={item.title}
                  timeAgo={item.timeAgo}
                  status="verified"
                  signature={item.sig}
                  icon={item.icon}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <PriorityAlertModal
        isOpen={alertOpen}
        title="Emergency Lockdown"
        description="This will immediately cut power to all non-essential relays, lock all gates, and broadcast an alert to all authorized wallets. This action is logged to the Solana blockchain."
        location="COMMAND CENTER — ALL SECTORS"
        onAuthorize={handleAuthorize}
        onDismiss={() => setAlertOpen(false)}
      />
    </>
  );
}
