"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Fingerprint, Bell, ToggleLeft, Info, Key, RotateCcw, ChevronRight } from "lucide-react";
import { RelayToggle } from "@/components/ui/RelayToggle";
import { pageTransitionVariants } from "@/lib/animations";

export default function SettingsPage() {
  const [sensitivity, setSensitivity] = useState(72);
  const [alertThreshold, setAlertThreshold] = useState(45);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [testnetMode, setTestnetMode] = useState(true);

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6"
    >
      {/* Detection Engine */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Detection Engine</h3>
          <div className="text-[9px] font-bold bg-accent-danger/10 border border-accent-danger/30 text-accent-danger px-2 py-0.5 rounded uppercase tracking-widest">
            Mode: Aggressive
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Motion Sensitivity</span>
            <span className="text-sm font-mono text-accent-cyan">{sensitivity}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 cursor-pointer"
            aria-label="Motion Sensitivity"
          />
          <div className="flex justify-between text-[9px] font-mono text-text-muted">
            <span>LOW</span><span>HIGH</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Alert Threshold</span>
            <span className="text-sm font-mono text-accent-warning">{alertThreshold}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={alertThreshold}
            onChange={(e) => setAlertThreshold(Number(e.target.value))}
            className="w-full accent-amber-500 h-1.5 cursor-pointer"
            aria-label="Alert Threshold"
          />
          <div className="flex justify-between text-[9px] font-mono text-text-muted">
            <span>LENIENT</span><span>STRICT</span>
          </div>
        </div>
      </section>

      {/* Access & Security */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Access & Security</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Fingerprint size={18} className="text-text-secondary" />
            <div>
              <div className="text-sm font-bold text-white">Biometric Unlock</div>
              <div className="text-[10px] text-text-muted">Device fingerprint / Face ID</div>
            </div>
          </div>
          <RelayToggle active={biometricEnabled} onChange={setBiometricEnabled} />
        </div>

        <div className="h-px w-full bg-zinc-800" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell size={18} className="text-text-secondary" />
            <div>
              <div className="text-sm font-bold text-white">Critical Alerts</div>
              <div className="text-[10px] text-text-muted">Push notifications for threats</div>
            </div>
          </div>
          <RelayToggle active={criticalAlerts} onChange={setCriticalAlerts} />
        </div>
      </section>

      {/* Solana Network */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Solana Network</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-accent-teal shadow-[0_0_5px_rgba(20,184,166,0.8)]" />
            <span className="text-sm text-white font-bold">Devnet Connection</span>
          </div>
          <span className="text-[9px] font-bold text-accent-teal bg-accent-teal/10 border border-accent-teal/30 px-2 py-0.5 rounded uppercase tracking-widest">Active</span>
        </div>

        <div className="h-px w-full bg-zinc-800" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ToggleLeft size={18} className="text-text-secondary" />
            <div>
              <div className="text-sm font-bold text-white">Testnet Mode</div>
              <div className="text-[10px] text-text-muted">Use Solana Devnet</div>
            </div>
          </div>
          <RelayToggle active={testnetMode} onChange={setTestnetMode} />
        </div>

        <div className="h-px w-full bg-zinc-800" />

        <button className="flex items-center justify-between w-full text-left group">
          <div className="flex items-center space-x-3">
            <Key size={18} className="text-text-secondary" />
            <div>
              <div className="text-sm font-bold text-white">Rotate Wallet Keys</div>
              <div className="text-[10px] text-text-muted">Re-derive signing keypair</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-text-muted group-hover:text-white transition-colors" />
        </button>
      </section>

      {/* Core Infrastructure */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Core Infrastructure</h3>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Info size={18} className="text-text-secondary" />
            <span className="text-sm font-bold text-white">Firmware Version</span>
          </div>
          <span className="font-mono text-sm text-text-secondary">v2.4.1-stable</span>
        </div>

        <div className="h-px w-full bg-zinc-800" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-white pl-[38px]">Hardware ID</span>
          <span className="font-mono text-sm text-text-secondary">AURA-NG-0091</span>
        </div>

        <div className="h-px w-full bg-zinc-800" />

        <button className="flex items-center justify-between w-full text-left group pl-0">
          <span className="text-sm font-bold text-white pl-[38px]">View Pairing Guide</span>
          <ChevronRight size={16} className="text-text-muted group-hover:text-white transition-colors" />
        </button>
      </section>

      {/* Danger Zone */}
      <div className="pt-2">
        <button className="w-full flex items-center justify-center space-x-2 py-4 border border-accent-danger/30 rounded-lg text-accent-danger text-xs font-bold tracking-widest uppercase hover:bg-accent-danger/10 transition-colors">
          <RotateCcw size={16} />
          <span>Reset Command Center</span>
        </button>
        <p className="text-[9px] text-text-muted text-center mt-2 uppercase tracking-wider">
          This will wipe all local configuration data.
        </p>
      </div>
    </motion.div>
  );
}
