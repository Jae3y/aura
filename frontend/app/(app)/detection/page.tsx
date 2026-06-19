"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RadarSweep } from "@/components/ui/RadarSweep";
import { ScanLine } from "@/components/ui/ScanLine";
import { SolanaExplorerBadge } from "@/components/ui/SolanaExplorerBadge";
import { Users, Wifi, Battery, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants, cardHoverVariants } from "@/lib/animations";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export default function DetectionMapPage() {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-5"
    >
      {/* Summary Panel */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={staggerParentVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerChildVariants} className="bg-card border border-zinc-800 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[9px] text-text-muted font-bold tracking-widest uppercase mb-1">Subjects</span>
          <AnimatedCounter value={3} className="text-2xl font-mono font-bold text-white" />
        </motion.div>
        <motion.div variants={staggerChildVariants} className="bg-accent-teal/10 border border-accent-teal/30 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[9px] text-accent-teal font-bold tracking-widest uppercase mb-1">Status</span>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-[10px] font-bold text-accent-teal uppercase tracking-wider mt-1"
          >
            Scanning
          </motion.span>
        </motion.div>
        <motion.div variants={staggerChildVariants} className="bg-accent-danger/10 border border-accent-danger/30 rounded-xl p-3 flex flex-col items-center text-center">
          <span className="text-[9px] text-accent-danger font-bold tracking-widest uppercase mb-1">Alerts</span>
          <AnimatedCounter value={2} className="text-2xl font-mono font-bold text-accent-danger" />
        </motion.div>
      </motion.div>

      {/* Radar Sweep */}
      <motion.div
        className="relative flex justify-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
      >
        <div className="relative w-72 h-72 bg-zinc-900/60 border border-zinc-800 rounded-full overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]">
          <ScanLine />
          <RadarSweep
            blips={[
              { angle: 45, distance: 0.65, type: "alert" },
              { angle: 210, distance: 0.38, type: "clear" },
              { angle: 310, distance: 0.72, type: "clear" },
            ]}
            className="w-full h-full"
          />
        </div>

        {/* HUD Labels */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-3 py-1 border border-zinc-800 rounded-full">
          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-text-secondary tracking-widest uppercase">
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-accent-danger"
            />
            <span>Live Feed</span>
            <span className="text-accent-cyan">· Link Verified</span>
          </div>
        </div>
      </motion.div>

      {/* Active Zones List */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-text-muted tracking-[0.2em] uppercase">Active Zones</h3>
        </div>

        <motion.div
          className="space-y-3"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          {/* Alert Zone */}
          <motion.div
            variants={staggerChildVariants}
            whileHover="hover"
            initial="rest"
          >
            <motion.div
              variants={cardHoverVariants}
              className="bg-card border border-accent-danger/40 rounded-xl p-4 flex flex-col relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-danger" />
              <ScanLine color="#EF4444" />
              <div className="flex justify-between items-start mb-3 pl-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">East Perimeter</h4>
                  <div className="text-[10px] text-accent-danger font-mono font-bold uppercase mt-0.5 flex items-center">
                    <AlertCircle size={10} className="mr-1" />
                    Restricted · Alert Active
                  </div>
                </div>
                <button className="text-[10px] text-accent-danger/70 hover:text-accent-danger transition-colors flex items-center font-bold tracking-widest uppercase">
                  Logs <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex items-center space-x-4 pl-3 text-text-secondary">
                <div className="flex items-center text-[10px] font-mono text-accent-danger"><Users size={10} className="mr-1" />1 DETECTED</div>
                <div className="flex items-center text-[10px] font-mono"><Wifi size={10} className="mr-1" />98%</div>
                <div className="flex items-center text-[10px] font-mono"><Battery size={10} className="mr-1" />100%</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Clear Zone */}
          <motion.div variants={staggerChildVariants} whileHover="hover" initial="rest">
            <motion.div
              variants={cardHoverVariants}
              className="bg-card border border-zinc-800 rounded-xl p-4 flex flex-col relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-teal" />
              <div className="flex justify-between items-start mb-3 pl-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Main Living Hall</h4>
                  <div className="text-[10px] text-accent-teal font-mono font-bold uppercase mt-0.5 flex items-center">
                    <CheckCircle2 size={10} className="mr-1" />
                    Occupied · Clear
                  </div>
                </div>
                <button className="text-[10px] text-text-muted hover:text-white transition-colors flex items-center font-bold tracking-widest uppercase">
                  Logs <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex items-center space-x-4 pl-3 text-text-secondary">
                <div className="flex items-center text-[10px] font-mono text-accent-cyan"><Users size={10} className="mr-1" />2 DETECTED</div>
                <div className="flex items-center text-[10px] font-mono"><Wifi size={10} className="mr-1" />92%</div>
                <div className="flex items-center text-[10px] font-mono"><Battery size={10} className="mr-1" />84%</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="flex justify-center pt-2">
        <SolanaExplorerBadge signature="8fM3...pL9x" />
      </div>
    </motion.div>
  );
}
