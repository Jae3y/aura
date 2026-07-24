"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Fan, PowerOff, Server, Home, Car, Settings, ChevronRight, Zap, Activity } from "lucide-react";
import { RelayToggle } from "@/components/ui/RelayToggle";
import { pageTransitionVariants } from "@/lib/animations";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { playRelayClick, playSurgeTripSound } from "@/components/ui/TactileSound";

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
    playSurgeTripSound();
    setZone1Active(false);
    setZone2Active(false);
    setZone3Active(false);
    setZone4Active(false);
    setVentilationActive(false);
    toast.error("💥 EMERGENCY KILL SWITCH ACTIVATED — ALL POWER ISOLATED ON-CHAIN!");
  };

  const handleArmToggle = () => {
    playRelayClick();
    const next = !armed;
    setArmed(next);
    toast.success(next ? "System ARMED & GUARDED" : "System DISARMED");
  };

  const handleVentilationToggle = () => {
    playRelayClick();
    const next = !ventilationActive;
    setVentilationActive(next);
    toast.success(`Ventilation system manually turned ${next ? "ON" : "OFF"}`);
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
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6 font-sans"
    >
      {/* Header telemetry badge */}
      <div className="flex items-center justify-between border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
        <div className="flex items-center gap-2">
          <span className={`led-indicator ${armed ? "led-green" : "led-amber"}`} />
          <span className="text-text-muted">OPS MODE:</span>
          <span className="text-white font-bold">{armed ? "ARMED & GUARDED" : "MANUAL OVERRIDE"}</span>
        </div>
        <span className="text-accent-cyan">DUAL-SSR RELAYS</span>
      </div>

      {/* Quick Overrides */}
      <div className="flex items-center space-x-2 font-mono">
        <button
          onClick={handleArmToggle}
          className={`flex items-center space-x-2 border px-3 py-3 w-1/3 justify-center transition-colors text-[10.5px] font-bold uppercase tracking-[0.14em] ${
            armed
              ? "bg-accent-teal/15 border-accent-teal/50 text-accent-teal"
              : "bg-black border-white/10 text-text-muted hover:text-white"
          }`}
        >
          <ShieldCheck size={16} />
          <span>{armed ? "Armed" : "Disarmed"}</span>
        </button>

        <button
          onClick={handleKillSwitch}
          className="flex items-center space-x-2 bg-accent-danger/15 border border-accent-danger/60 px-3 py-3 text-accent-danger flex-1 justify-center hover:bg-accent-danger hover:text-black transition-colors text-[10.5px] font-bold uppercase tracking-[0.14em]"
        >
          <PowerOff size={16} />
          <span>KILL SWITCH</span>
        </button>

        <button
          onClick={handleVentilationToggle}
          className={`flex items-center space-x-2 border px-3 py-3 flex-1 justify-center transition-colors text-[10.5px] font-bold uppercase tracking-[0.14em] ${
            ventilationActive
              ? "bg-accent-cyan/20 border-accent-cyan text-white"
              : "bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/20"
          }`}
        >
          <Fan size={16} className={ventilationActive ? "animate-spin" : ""} style={{ animationDuration: "1s" }} />
          <span>Ventilation</span>
        </button>
      </div>

      {/* Zone Control Matrix */}
      <div className="flex flex-col space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-text-muted tracking-[0.22em] uppercase">
            [ ACTIVE RELAY ZONES // {config.zonePlural.toUpperCase()} ]
          </h3>
          <span className="text-[9.5px] text-accent-cyan">SAMPLING 10kHz</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { name: z1, active: zone1Active, setActive: setZone1Active, load: "12.4A" },
            { name: z2, active: zone2Active, setActive: setZone2Active, load: "8.2A" },
            { name: z3, active: zone3Active, setActive: setZone3Active, load: "0.0A" },
            { name: z4, active: zone4Active, setActive: setZone4Active, load: "4.2A" },
          ].map(({ name, active, setActive, load }, idx) => {
            const Icon = zoneIcon(idx);
            return (
              <div
                key={name}
                className="bg-card border border-white/10 p-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="flex h-8 w-8 items-center justify-center border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan mb-2">
                      <Icon size={16} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                      {name}
                    </span>
                    <span className="text-[9px] text-text-muted font-mono uppercase mt-1">
                      LOAD: <span className="text-accent-cyan font-bold num-tabular">{active ? load : "0.0A"}</span>
                    </span>
                  </div>

                  <RelayToggle
                    active={active}
                    onChange={(val) => {
                      playRelayClick();
                      setActive(val);
                      toast.success(`${name} relay turned ${val ? "ON" : "OFF"}`);
                    }}
                    size="sm"
                  />
                </div>

                <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase ${active ? "text-accent-teal" : "text-accent-danger"}`}>
                    {active ? "CLOSED [ENGAGED]" : "OPEN [TRIPPED]"}
                  </span>
                  <button
                    onClick={() => {
                      playRelayClick();
                      toast.info(`Opening ${name} registry`);
                    }}
                    className="text-[9.5px] font-bold tracking-wider uppercase text-text-muted hover:text-white transition-colors flex items-center"
                  >
                    SPECS <ChevronRight size={10} className="ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Protocols */}
      <div className="flex flex-col space-y-3 font-mono">
        <h3 className="text-[10px] font-bold text-text-muted tracking-[0.22em] uppercase">
          [ AUTOMATED SCHEDULED PROTOCOLS ]
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3.5 bg-black border border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {config.id === "hospital" ? "Night Ward Lock" : config.id === "industrial" ? "Night Shutdown" : "Night Temp Lock"}
              </span>
              <span className="text-[9.5px] text-text-muted uppercase mt-0.5">Executes Daily at 22:00 UTC</span>
            </div>
            <RelayToggle active={nightTempActive} onChange={(val) => {
              playRelayClick();
              setNightTempActive(val);
              toast.success(`Night protocol ${val ? "ENABLED" : "DISABLED"}`);
            }} size="sm" />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-black border border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {config.id === "hospital" ? "Backup Generator Failover" : config.id === "industrial" ? "Grid Demand Mode" : "Solar Charging Mode"}
              </span>
              <span className="text-[9.5px] text-text-muted uppercase mt-0.5">
                {config.id === "home" ? "Grid offset optimization" : "Automatic hardware failover"}
              </span>
            </div>
            <RelayToggle active={solarActive} onChange={(val) => {
              playRelayClick();
              setSolarActive(val);
              toast.success(`Power protocol ${val ? "ENABLED" : "DISABLED"}`);
            }} size="sm" />
          </div>
        </div>
      </div>

      {/* Solana Proof Notice */}
      <div className="mt-auto border-t border-white/10 pt-4 text-center font-mono text-[9.5px] text-text-muted uppercase tracking-[0.14em]">
        <p className="flex items-center justify-center gap-1.5">
          <Activity size={12} className="text-accent-cyan" />
          ALL RELAY ISOLATIONS ARE SIGNED VIA ED25519 & ANCHORED TO SOLANA DEVNET
        </p>
      </div>
    </motion.div>
  );
}
