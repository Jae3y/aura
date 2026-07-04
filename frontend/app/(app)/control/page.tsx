"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Fan, PowerOff, Server, Home, Car, Settings, ChevronRight } from "lucide-react";
import { RelayToggle } from "@/components/ui/RelayToggle";
import { pageTransitionVariants } from "@/lib/animations";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

export default function EnvironmentControlPage() {
  const [zone1Active, setZone1Active] = useState(true);
  const [zone2Active, setZone2Active] = useState(true);
  const [zone3Active, setZone3Active] = useState(false);
  const [zone4Active, setZone4Active] = useState(true);
  const [nightTempActive, setNightTempActive] = useState(true);
  const [solarActive, setSolarActive] = useState(false);
  const [ventilationActive, setVentilationActive] = useState(false);
  const [armed, setArmed] = useState(true);

  const { config } = useEnvironmentStore();
  const [z1, z2, z3, z4] = config.zones;

  const handleKillSwitch = () => {
    setZone1Active(false);
    setZone2Active(false);
    setZone3Active(false);
    setZone4Active(false);
    setVentilationActive(false);
    toast.error("💥 EMERGENCY KILL SWITCH ACTIVATED — ALL POWER ISOLATED ON-CHAIN!");
  };

  const zoneIcon = (index: number) => {
    if (config.id === "home") return [Home, Server, Car, Settings][index];
    if (config.id === "hospital") return [Server, Settings, Car, Home][index];
    return [Server, Settings, Car, Home][index];
  };

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
        <button
          onClick={() => {
            setArmed(!armed);
            toast.success(armed ? "System DISARMED" : "System ARMED & GUARDED");
          }}
          className={`flex items-center space-x-2 border px-3 py-2 rounded w-1/3 justify-center transition-colors ${
            armed
              ? "bg-accent-teal/10 border-accent-teal/30 text-accent-teal"
              : "bg-zinc-900 border-zinc-800 text-text-muted hover:text-white"
          }`}
        >
          <ShieldCheck size={16} />
          <span className="text-[10px] font-bold tracking-widest uppercase">{armed ? "Armed" : "Disarmed"}</span>
        </button>

        <button
          onClick={handleKillSwitch}
          className="flex items-center space-x-2 bg-accent-danger/10 border border-accent-danger/50 px-3 py-2 rounded text-accent-danger flex-1 justify-center hover:bg-accent-danger/20 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        >
          <PowerOff size={16} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Kill Switch</span>
        </button>

        <button
          onClick={() => {
            setVentilationActive(!ventilationActive);
            toast.success(`Ventilation system manually turned ${!ventilationActive ? "ON" : "OFF"}`);
          }}
          className={`flex items-center space-x-2 border px-3 py-2 rounded flex-1 justify-center transition-colors ${
            ventilationActive
              ? "bg-accent-cyan/20 border-accent-cyan text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              : "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/20"
          }`}
        >
          <Fan size={16} className={ventilationActive ? "animate-spin" : ""} style={{ animationDuration: "1s" }} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Ventilation</span>
        </button>
      </div>

      {/* Zone Control Matrix */}
      <div className="flex flex-col space-y-3">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Active {config.zonePlural}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: z1, active: zone1Active, setActive: setZone1Active, highlighted: true },
            { name: z2, active: zone2Active, setActive: setZone2Active, highlighted: false },
            { name: z3, active: zone3Active, setActive: setZone3Active, highlighted: false },
            { name: z4, active: zone4Active, setActive: setZone4Active, highlighted: false },
          ].map(({ name, active, setActive, highlighted }, idx) => {
            const Icon = zoneIcon(idx);
            return (
              <div
                key={name}
                className={`bg-card rounded-lg p-4 flex flex-col justify-between ${
                  highlighted
                    ? "border border-accent-cyan/30 shadow-[0_0_10px_rgba(6,182,212,0.1)] relative overflow-hidden"
                    : "border border-zinc-800"
                }`}
              >
                {highlighted && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-accent-cyan/10 rounded-bl-full blur-xl" />
                )}
                <div className={`flex items-start justify-between mb-4 ${highlighted ? "relative z-10" : ""}`}>
                  <div className="flex flex-col">
                    <Icon size={16} className={highlighted ? "text-accent-cyan mb-2 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" : "text-text-secondary mb-2"} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${highlighted ? "text-accent-cyan" : "text-white"}`}>{name}</span>
                    <span className="text-[9px] text-text-muted font-mono uppercase mt-1">{[4, 12, 2, 6][idx]} Units</span>
                  </div>
                  <RelayToggle
                    active={active}
                    onChange={(val) => {
                      setActive(val);
                      toast.success(`${name} relay turned ${val ? "ON" : "OFF"}`);
                    }}
                    size="sm"
                  />
                </div>
                <button
                  onClick={() => toast.info(`Opening ${name} registry`)}
                  className={`text-[10px] font-bold tracking-widest uppercase flex items-center mt-2 group text-left ${highlighted ? "text-accent-cyan relative z-10" : "text-text-secondary hover:text-white transition-colors"}`}
                >
                  View All <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Protocols */}
      <div className="flex flex-col space-y-3">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Scheduled Protocols</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-card border border-zinc-800 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {config.id === "hospital" ? "Night Ward Lock" : config.id === "industrial" ? "Night Shutdown" : "Night Temp Lock"}
              </span>
              <span className="text-[10px] text-text-muted font-mono uppercase mt-1">Runs at 22:00 Daily</span>
            </div>
            <RelayToggle active={nightTempActive} onChange={(val) => {
              setNightTempActive(val);
              toast.success(`Night protocol ${val ? "ENABLED" : "DISABLED"}`);
            }} size="sm" />
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-zinc-800 rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                {config.id === "hospital" ? "Backup Generator" : config.id === "industrial" ? "Grid Demand Mode" : "Solar Charging"}
              </span>
              <span className="text-[10px] text-text-muted font-mono uppercase mt-1">
                {config.id === "home" ? "Grid offset mode" : "Automatic failover"}
              </span>
            </div>
            <RelayToggle active={solarActive} onChange={(val) => {
              setSolarActive(val);
              toast.success(`Power protocol ${val ? "ENABLED" : "DISABLED"}`);
            }} size="sm" />
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
