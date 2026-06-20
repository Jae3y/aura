"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Cpu, ShieldCheck, WifiOff } from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";
import { useDevices } from "@/lib/queries/useDevices";

export default function DevicesPage() {
  const { data: devices = [], isLoading } = useDevices();
  const onlineCount = devices.filter((device) => device.is_online).length;

  if (isLoading) {
    return (
      <div className="panel-card rounded-xl p-8 text-center text-text-secondary">
        Loading device registry...
      </div>
    );
  }

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <section className="panel-surface rounded-xl p-6">
        <p className="section-label">Device Registry</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase text-white">Connected Systems</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Pair, inspect, and route devices into zones, environment controls, and threat workflows.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
            {onlineCount}/{devices.length} online
          </div>
        </div>
      </section>

      {devices.length === 0 ? (
        <section className="panel-card rounded-xl p-8 text-center">
          <Cpu className="mx-auto h-10 w-10 text-text-muted" />
          <h3 className="mt-4 text-lg font-bold text-white">No devices yet</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Connect a gateway to start populating telemetry, zones, and reports.
          </p>
          <Link href="/connect" className="mt-5 inline-flex rounded-lg bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-200">
            Connect a system
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {devices.map((device, index) => (
            <motion.article
              key={device.id}
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
                <Link href={`/devices/${device.id}`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold uppercase text-cyan-200">
                  Open device <ArrowRight size={14} />
                </Link>
                <Link href={`/zones/${device.id}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-text-secondary hover:text-white">
                  View zones
                </Link>
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </motion.div>
  );
}
