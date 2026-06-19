"use client";

import { motion } from "framer-motion";
import { Shield, Fan, PowerOff, Server, Home, Car, Settings, ChevronRight } from "lucide-react";
import { RelayToggle } from "@/components/ui/RelayToggle";
import { pageTransitionVariants } from "@/lib/animations";

export default function EnvironmentControlPage() {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6"
    >
      {/* Quick Overrides */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-accent-teal/10 border border-accent-teal/30 px-3 py-2 rounded text-accent-teal w-1/3 justify-center">
          <Shield size={16} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Armed</span>
        </div>
        <button className="flex items-center space-x-2 bg-accent-danger/10 border border-accent-danger/50 px-3 py-2 rounded text-accent-danger flex-1 justify-center hover:bg-accent-danger/20 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)]">
          <PowerOff size={16} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Kill Switch</span>
        </button>
        <button className="flex items-center space-x-2 bg-accent-cyan/10 border border-accent-cyan/50 px-3 py-2 rounded text-accent-cyan flex-1 justify-center hover:bg-accent-cyan/20 transition-colors">
          <Fan size={16} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Ventilation</span>
        </button>
      </div>

      {/* Zone Control Matrix */}
      <div className="flex flex-col space-y-3">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Active Zones</h3>
        <div className="grid grid-cols-2 gap-3">
          
          {/* Living Room */}
          <div className="bg-card border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col">
                <Home size={16} className="text-text-secondary mb-2" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Living Room</span>
                <span className="text-[9px] text-text-muted font-mono uppercase mt-1">4 Units</span>
              </div>
              <RelayToggle active={true} size="sm" />
            </div>
            <button className="text-[10px] text-accent-cyan font-bold tracking-widest uppercase flex items-center mt-2 group">
              View All <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Server Room */}
          <div className="bg-card border border-accent-cyan/30 rounded-lg p-4 flex flex-col justify-between shadow-[0_0_10px_rgba(6,182,212,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent-cyan/10 rounded-bl-full blur-xl" />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="flex flex-col">
                <Server size={16} className="text-accent-cyan mb-2 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
                <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider">Server Room</span>
                <span className="text-[9px] text-text-muted font-mono uppercase mt-1">12 Units</span>
              </div>
              <RelayToggle active={true} size="sm" />
            </div>
            <button className="text-[10px] text-accent-cyan font-bold tracking-widest uppercase flex items-center mt-2 group relative z-10">
              View All <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Garage Bay */}
          <div className="bg-card border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col">
                <Car size={16} className="text-text-secondary mb-2" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Garage Bay</span>
                <span className="text-[9px] text-text-muted font-mono uppercase mt-1">2 Units</span>
              </div>
              <RelayToggle active={false} size="sm" />
            </div>
            <button className="text-[10px] text-text-secondary font-bold tracking-widest uppercase flex items-center mt-2 group hover:text-white transition-colors">
              View All <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Master Suite */}
          <div className="bg-card border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col">
                <Settings size={16} className="text-text-secondary mb-2" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Master Suite</span>
                <span className="text-[9px] text-text-muted font-mono uppercase mt-1">6 Units</span>
              </div>
              <RelayToggle active={true} size="sm" />
            </div>
            <button className="text-[10px] text-accent-cyan font-bold tracking-widest uppercase flex items-center mt-2 group">
              View All <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Scheduled Protocols */}
      <div className="flex flex-col space-y-3">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Scheduled Protocols</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-card border border-zinc-800 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Night Temp Lock</span>
              <span className="text-[10px] text-text-muted font-mono uppercase mt-1">Runs at 22:00 Daily</span>
            </div>
            <RelayToggle active={true} size="sm" />
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-zinc-800 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Solar Charging</span>
              <span className="text-[10px] text-text-muted font-mono uppercase mt-1">Grid offset mode</span>
            </div>
            <RelayToggle active={false} size="sm" />
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-auto pt-6 text-center">
        <p className="text-[9px] text-text-muted font-mono tracking-widest uppercase">
          All relay interactions are permanently logged to the Solana blockchain.
        </p>
      </div>
    </motion.div>
  );
}
