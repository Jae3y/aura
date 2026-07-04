"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Bell, ToggleLeft, Info, RotateCcw, ChevronRight, Activity, Zap, FileText, Globe, ShieldCheck, Server } from "lucide-react";
import { RelayToggle } from "@/components/ui/RelayToggle";
import { pageTransitionVariants } from "@/lib/animations";
import { useDevices } from "@/lib/queries/useDevices";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { useEnvironmentStore, ENVIRONMENT_CONFIGS } from "@/lib/stores/environmentStore";
import Link from "next/link";

const ENV_ICONS = { home: Globe, hospital: ShieldCheck, industrial: Server };

export default function SettingsPage() {
  const [sensitivity, setSensitivity] = useState(72);
  const [alertThreshold, setAlertThreshold] = useState(45);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [testnetMode, setTestnetMode] = useState(true);

  const { data: devices } = useDevices();
  const [selectedSimDevice, setSelectedSimDevice] = useState<string>("");
  const activeSimDevice = selectedSimDevice || devices?.[0]?.id || "";
  const [isSimulatingThreat, setIsSimulatingThreat] = useState(false);
  const [isSimulatingAudit, setIsSimulatingAudit] = useState(false);

  const { config } = useEnvironmentStore();

  const handleSimulateThreat = async () => {
    if (!activeSimDevice) {
      toast.error("Please select a device node to simulate");
      return;
    }
    setIsSimulatingThreat(true);
    try {
      await apiClient.post(`/devices/${activeSimDevice}/simulate-threat`);
      toast.success("Simulated electrical surge anomaly recorded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Threat simulation failed");
    } finally {
      setIsSimulatingThreat(false);
    }
  };

  const handleSimulateAudit = async () => {
    if (!activeSimDevice) {
      toast.error("Please select a device node to simulate");
      return;
    }
    setIsSimulatingAudit(true);
    try {
      const res = await apiClient.post<{ report?: { lisk_tx_id?: string } }>(`/devices/${activeSimDevice}/simulate-audit`);
      toast.success(`Lisk Audit Sync complete! Transaction: ${res.report?.lisk_tx_id || "Mock signature"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Audit simulation failed");
    } finally {
      setIsSimulatingAudit(false);
    }
  };

  const handleResetLocalConfig = () => {
    setSensitivity(72);
    setAlertThreshold(45);
    setCriticalAlerts(true);
    setTestnetMode(true);
    toast.success("Local command center preferences reset");
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6"
    >
      {/* ── Environment Configuration Card ─────────────────────────── */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(() => { const Icon = ENV_ICONS[config.id]; return <Icon size={16} className={config.badgeColor} />; })()}
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">Operational Environment</h3>
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
            {config.shortName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: "Mode", value: config.name },
            { label: "Voltage Range", value: config.voltageRange },
            { label: "Detection", value: config.detectionMode },
            { label: "Alert Channels", value: config.alertChannels },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">{label}</p>
              <p className="font-semibold text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">Active {config.zonePlural}</p>
          <div className="flex flex-wrap gap-1.5">
            {config.zones.map((zone) => (
              <span key={zone} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
                {zone}
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/env-control"
          className="flex items-center justify-between w-full group"
        >
          <span className="text-xs font-bold text-accent-cyan">Switch Environment Mode</span>
          <ChevronRight size={14} className="text-accent-cyan group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>

      {/* ── Detection Engine ───────────────────────────────────────── */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Detection Engine</h3>
          <div className="text-[9px] font-bold bg-accent-danger/10 border border-accent-danger/30 text-accent-danger px-2 py-0.5 rounded uppercase tracking-widest">
            Mode: {config.detectionMode}
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

      {/* ── Notification Routing ───────────────────────────────────── */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Notification Routing</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell size={18} className="text-text-secondary" />
            <div>
              <div className="text-sm font-bold text-white">Critical Alerts</div>
              <div className="text-[10px] text-text-muted">via {config.alertChannels}</div>
            </div>
          </div>
          <RelayToggle active={criticalAlerts} onChange={setCriticalAlerts} />
        </div>
      </section>

      {/* ── Solana Network ─────────────────────────────────────────── */}
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
        <div className="rounded-lg border border-dashed border-zinc-800 p-3">
          <div className="text-sm font-bold text-white">Wallet key rotation unavailable</div>
          <div className="mt-1 text-[10px] text-text-muted">
            Use Profile and Access Control for identity changes. Automatic key rotation is not wired in this build.
          </div>
        </div>
      </section>

      {/* ── Core Infrastructure ────────────────────────────────────── */}
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
        <button type="button" className="flex items-center justify-between w-full text-left group pl-0" onClick={() => toast.success("Pairing guide opens from the Connect flow")}>
          <span className="text-sm font-bold text-white pl-[38px]">View Pairing Guide</span>
          <ChevronRight size={16} className="text-text-muted group-hover:text-white transition-colors" />
        </button>
      </section>

      {/* ── System Test & Simulation Suite ─────────────────────────── */}
      <section className="bg-card border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2 mb-1">
          <Activity size={18} className="text-green-500" />
          <h3 className="text-xs font-bold text-white tracking-widest uppercase">System Simulator Suite</h3>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          Simulate real-time anomalies and audit digests to test Solana ledger verification, Alerta notification routing, and Lisk audit protocols.
        </p>
        {devices && devices.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-zinc-500">Target {config.device} Node</label>
              <select
                value={activeSimDevice}
                onChange={(e) => setSelectedSimDevice(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.location_label || "Main"})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSimulateThreat}
                disabled={isSimulatingThreat}
                className="flex items-center justify-center space-x-2 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded font-semibold text-xs transition-colors"
              >
                <Zap size={14} />
                <span>{isSimulatingThreat ? "Simulating..." : `Simulate ${config.threat}`}</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateAudit}
                disabled={isSimulatingAudit}
                className="flex items-center justify-center space-x-2 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded font-semibold text-xs transition-colors"
              >
                <FileText size={14} />
                <span>{isSimulatingAudit ? "Syncing..." : "Simulate Audit"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 border border-dashed border-zinc-800 rounded">
            <p className="text-xs text-text-muted">No active {config.devicePlural.toLowerCase()} paired to run simulations.</p>
          </div>
        )}
      </section>

      {/* ── Danger Zone ────────────────────────────────────────────── */}
      <div className="pt-2">
        <button type="button" onClick={handleResetLocalConfig} className="w-full flex items-center justify-center space-x-2 py-4 border border-accent-danger/30 rounded-lg text-accent-danger text-xs font-bold tracking-widest uppercase hover:bg-accent-danger/10 transition-colors">
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
