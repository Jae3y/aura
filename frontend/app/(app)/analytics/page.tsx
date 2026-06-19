"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Activity, Zap, Cpu, Thermometer, Wifi } from "lucide-react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants, cardHoverVariants } from "@/lib/animations";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ScanLine } from "@/components/ui/ScanLine";
import { ParticleField } from "@/components/ui/ParticleField";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const detectionData = [2, 5, 3, 8, 4, 1, 3];
const loadData = [18, 24, 21, 28, 22, 15, 19];
const maxDetection = Math.max(...detectionData);
const maxLoad = Math.max(...loadData);

const devices = [
  { name: "PIR Array – East", uptime: "99.4%", health: 98, icon: Activity },
  { name: "PZEM-004T Meter", uptime: "99.9%", health: 100, icon: Zap },
  { name: "Relay Hub Alpha", uptime: "97.2%", health: 94, icon: Cpu },
  { name: "Temp Sensor – Server", uptime: "100%", health: 100, icon: Thermometer },
  { name: "WiFi Node – Gate", uptime: "95.1%", health: 88, icon: Wifi },
];

export default function AnalyticsPage() {
  const detectionRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef<HTMLDivElement>(null);

  // GSAP bar animation for detection chart
  useGSAP(
    () => {
      gsap.from(".detection-bar", {
        scaleY: 0,
        transformOrigin: "bottom",
        stagger: 0.07,
        duration: 0.6,
        ease: "back.out(1.5)",
        delay: 0.3,
      });
    },
    { scope: detectionRef }
  );

  // GSAP bar animation for load chart
  useGSAP(
    () => {
      gsap.from(".load-bar", {
        scaleY: 0,
        transformOrigin: "bottom",
        stagger: 0.07,
        duration: 0.6,
        ease: "back.out(1.5)",
        delay: 0.6,
      });
    },
    { scope: loadRef }
  );

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-5"
    >
      {/* System Integrity */}
      <motion.div
        className="relative bg-card border border-zinc-800 rounded-xl p-5 flex items-center space-x-5 overflow-hidden"
        whileHover={{ borderColor: "rgba(6,182,212,0.3)" }}
        transition={{ duration: 0.3 }}
      >
        <ScanLine />
        {/* Radial Health Gauge */}
        <div className="relative w-22 h-22 shrink-0 flex items-center justify-center" style={{ width: 88, height: 88 }}>
          <svg viewBox="0 0 88 88" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="44" cy="44" r="36" stroke="#27272A" strokeWidth="6" fill="none" />
            <motion.circle
              cx="44" cy="44" r="36" stroke="#06B6D4" strokeWidth="6" fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - 0.94) }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
              style={{ filter: "drop-shadow(0 0 6px rgba(6,182,212,0.8))" }}
            />
          </svg>
          <div className="z-10 text-center">
            <AnimatedCounter value={94} suffix="%" className="text-lg font-mono font-bold text-white" />
          </div>
        </div>

        <div className="flex flex-col space-y-2 flex-1">
          <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">System Health</span>
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Response Time</span>
              <AnimatedCounter value={0.8} decimals={1} suffix="s" className="text-sm font-mono text-white font-bold" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Surges Prevented</span>
              <AnimatedCounter value={12} className="text-sm font-mono text-accent-warning font-bold" />
            </div>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent-cyan/5 rounded-bl-full blur-2xl pointer-events-none" />
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Avg. Response", value: 1.4, decimals: 1, suffix: "s", color: "text-accent-teal" },
          { label: "Surge Freq.", value: 3.2, decimals: 1, suffix: "/wk", color: "text-accent-warning" },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={cardHoverVariants}
            initial="rest"
            whileHover="hover"
            className="bg-card border border-zinc-800 rounded-xl p-4"
          >
            <div className="text-[9px] text-text-muted font-bold tracking-widest uppercase mb-1">{kpi.label}</div>
            <AnimatedCounter
              value={kpi.value}
              decimals={kpi.decimals}
              suffix={kpi.suffix}
              duration={1.5}
              className={`text-2xl font-mono font-bold ${kpi.color}`}
            />
          </motion.div>
        ))}
      </div>

      {/* Detection Frequency Chart */}
      <div ref={detectionRef} className="relative bg-card border border-zinc-800 rounded-xl p-5 overflow-hidden">
        <ScanLine color="#06B6D4" />
        <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4">Detection Frequency</h3>
        <div className="flex items-end justify-between h-24 space-x-2">
          {weekDays.map((day, i) => (
            <div key={day} className="flex flex-col items-center flex-1 space-y-1">
              <div
                className="detection-bar w-full rounded-t bg-gradient-to-t from-accent-cyan/30 to-accent-cyan/10 border-t border-accent-cyan/50 relative overflow-hidden"
                style={{ height: `${(detectionData[i] / maxDetection) * 80}px`, minHeight: 4 }}
              >
                {detectionData[i] === maxDetection && (
                  <div className="absolute inset-0 bg-accent-cyan/20 animate-pulse" />
                )}
              </div>
              <span className="text-[9px] text-text-muted font-mono">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Electrical Load Chart */}
      <div ref={loadRef} className="relative bg-card border border-zinc-800 rounded-xl p-5 overflow-hidden">
        <ScanLine color="#A855F7" />
        <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4">Electrical Load Distribution</h3>
        <div className="flex items-end justify-between h-24 space-x-2">
          {weekDays.map((day, i) => (
            <div key={day} className="flex flex-col items-center flex-1 space-y-1">
              <div
                className="load-bar w-full rounded-t bg-gradient-to-t from-accent-purple/30 to-accent-purple/10 border-t border-accent-purple/50"
                style={{ height: `${(loadData[i] / maxLoad) * 80}px`, minHeight: 4 }}
              />
              <span className="text-[9px] text-text-muted font-mono">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Device Status */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Device Status</h3>
          <Link href="/log" className="text-[10px] text-accent-cyan font-bold tracking-widest uppercase flex items-center hover:underline">
            View Log <ChevronRight size={12} />
          </Link>
        </div>
        <motion.div
          className="space-y-2"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          {devices.map((device) => {
            const DeviceIcon = device.icon;
            const healthColor = device.health >= 95 ? "text-accent-teal" : device.health >= 85 ? "text-accent-warning" : "text-accent-danger";
            const barColor = device.health >= 95 ? "bg-accent-teal" : device.health >= 85 ? "bg-accent-warning" : "bg-accent-danger";
            return (
              <motion.div
                key={device.name}
                variants={staggerChildVariants}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="flex items-center justify-between bg-card border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="flex items-center space-x-3">
                  <DeviceIcon size={14} className="text-text-secondary shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">{device.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-16 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${barColor} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${device.health}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        />
                      </div>
                      <div className="text-[9px] text-text-muted font-mono">{device.uptime}</div>
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-mono font-bold ${healthColor}`}>{device.health}%</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
