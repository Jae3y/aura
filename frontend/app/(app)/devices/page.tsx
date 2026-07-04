"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, Cpu, ShieldCheck, WifiOff, Plus, X, Laptop } from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";
import type { Database } from "@/lib/types/database";
import { useDevices, useCreateDevice, usePairDevice, useDeleteDevice } from "@/lib/queries/useDevices";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

export default function DevicesPage() {
  const { data: devices = [], isLoading } = useDevices();
  const createDeviceMutation = useCreateDevice();
  const { config } = useEnvironmentStore();
  const onlineCount = devices.filter((device) => device.is_online).length;

  // Modal and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [environment, setEnvironment] = useState<"home" | "hospital" | "industrial">("home");
  const [customToken, setCustomToken] = useState("");

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tokenToUse = isSimulated 
      ? `aura-sim-${Math.random().toString(36).substring(2, 10).toUpperCase()}` 
      : customToken;
      
    if (!tokenToUse || tokenToUse.length < 8) {
      toast.error("Device token must be at least 8 characters");
      return;
    }

    try {
      await createDeviceMutation.mutateAsync({
        name: isSimulated ? "Simulated Gateway Node" : deviceName || "AURA Gateway Node",
        environment_type: environment,
        location_label: isSimulated ? "Front Perimeter" : location || "Main Lobby",
        device_token: tokenToUse,
        firmware_version: isSimulated ? "2.4.2" : "1.0.0",
      });
      setIsModalOpen(false);
      // Reset form
      setDeviceName("");
      setCustomToken("");
      setLocation("");
      setIsSimulated(true);
    } catch (err) {
      // Error handled by query mutation
    }
  };

  if (isLoading) {
    return (
      <div className="panel-card rounded-xl p-8 text-center text-text-secondary">
        Loading {config.registry.toLowerCase()}...
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        <section className="panel-surface rounded-xl p-6">
          <p className="section-label">{config.registry}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold uppercase text-white">Connected Systems</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Pair, inspect, and route {config.devicePlural.toLowerCase()} into {config.zonePlural.toLowerCase()}, environment controls, and {config.threat.toLowerCase()} workflows.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black uppercase text-black hover:bg-cyan-300 transition-colors"
              >
                <Plus size={16} /> Register {config.device}
              </button>
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                {onlineCount}/{devices.length} online
              </div>
            </div>
          </div>
        </section>

        {devices.length === 0 ? (
          <section className="panel-card rounded-xl p-8 text-center">
            <Cpu className="mx-auto h-10 w-10 text-text-muted" />
            <h3 className="mt-4 text-lg font-bold text-white">No {config.devicePlural.toLowerCase()} yet</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Provision a simulated {config.device.toLowerCase()} to unblock telemetry simulations or pair a physical ESP32 gateway.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex rounded-lg bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-400/25 transition-colors"
            >
              Provision / Pair a {config.device}
            </button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {devices.map((device, index) => (
              <DeviceCard key={device.id} device={device} index={index} />
            ))}
          </section>
        )}
      </motion.div>

      {/* Device Registration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center space-x-2 text-accent-cyan">
                  <Cpu size={18} />
                  <h3 className="font-heading font-bold text-sm tracking-widest uppercase">Register {config.device}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-text-muted hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRegisterDevice} className="space-y-4">
                {/* Node Mode Selection */}
                <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIsSimulated(true)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-md transition-all ${
                      isSimulated
                        ? "bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    <Laptop size={12} />
                    <span>Simulated Node</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimulated(false)}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-md transition-all ${
                      !isSimulated
                        ? "bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    <Cpu size={12} />
                    <span>Physical ESP32</span>
                  </button>
                </div>

                {isSimulated ? (
                  /* Simulated Node Info */
                  <div className="bg-cyan-500/5 border border-cyan-400/20 rounded-lg p-3 space-y-2 text-xs text-text-secondary leading-relaxed">
                    <p className="font-semibold text-accent-cyan uppercase tracking-wider text-[10px]">Simulation Preset Active</p>
                    <p>
                      This will automatically register a simulated gateway node. Telemetry simulations (electrical surges, presence triggers) will be instantly unlocked in the Settings suite.
                    </p>
                  </div>
                ) : (
                  /* Physical Node Configuration Form */
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Device Name</label>
                      <input
                        type="text"
                        required
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="e.g. AURA Server Gateway"
                        className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Location Label</label>
                      <input
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Server Room"
                        className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Device Token (min 8 chars)</label>
                      <input
                        type="text"
                        required
                        value={customToken}
                        onChange={(e) => setCustomToken(e.target.value)}
                        placeholder="e.g. secure-esp32-auth-token"
                        className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-colors font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Common Fields */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Deployment Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as "home" | "hospital" | "industrial")}
                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-green-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none cursor-pointer"
                  >
                    <option value="home">Home / Domestic</option>
                    <option value="hospital">Hospital / Care Hub</option>
                    <option value="industrial">Industrial Node</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-text-secondary rounded text-xs font-bold uppercase hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDeviceMutation.isPending}
                    className="flex-1 py-2.5 bg-cyan-400 text-black rounded text-xs font-bold uppercase hover:bg-cyan-300 disabled:opacity-50 transition-colors"
                  >
                    {createDeviceMutation.isPending ? "Registering..." : "Register Node"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Device Card Sub-Component ────────────────────────────────────────────
function DeviceCard({ device, index }: { device: Database['public']['Tables']['devices']['Row']; index: number }) {
  const pairMutation = usePairDevice(device.id);
  const deleteMutation = useDeleteDevice();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="panel-card rounded-xl p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Cpu size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">{device.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">
              {device.location_label ?? "Unassigned"} · FW {device.firmware_version}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
          device.is_online ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
        }`}>
          {device.is_online ? "Online" : "Offline"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-white/[0.03] p-3">
          <Activity className="mb-2 h-4 w-4 text-cyan-300" />
          <p className="text-text-muted">Sensitivity</p>
          <p className="mt-1 font-bold uppercase text-white">{device.surge_sensitivity}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3">
          <ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />
          <p className="text-text-muted">NFT</p>
          <p className="mt-1 font-bold text-white">{device.nft_mint_address ? "Minted" : "Pending"}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3">
          <WifiOff className="mb-2 h-4 w-4 text-amber-300" />
          <p className="text-text-muted">Last seen</p>
          <p className="mt-1 font-bold text-white">
            {device.last_seen ? new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Never"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/devices/${device.id}`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold uppercase text-cyan-200 hover:bg-cyan-400/20 transition-colors">
          Open device <ArrowRight size={14} />
        </Link>
        <Link href={`/zones/${device.id}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
          View zones
        </Link>
        {!device.nft_mint_address && (
          <button
            onClick={() => pairMutation.mutateAsync()}
            disabled={pairMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold uppercase text-emerald-200 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
          >
            {pairMutation.isPending ? "Minting..." : "Mint NFT"}
          </button>
        )}
        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={() => { deleteMutation.mutate(device.id); setConfirmDelete(false); }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold uppercase text-red-200 hover:bg-red-400/20 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold uppercase text-red-300 hover:bg-red-400/10 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </motion.article>
  );
}
