"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ShieldAlert, Zap, Activity, ChevronDown, ShieldCheck } from "lucide-react";
import { VerificationLogRow } from "@/components/ui/VerificationLogRow";
import { pageTransitionVariants } from "@/lib/animations";
import { clsx } from "clsx";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

const TABS = ["All Logs", "Security", "Automation", "System"] as const;
type Tab = typeof TABS[number];

const HOME_LOGS = [
  {
    id: "1",
    title: "Front Perimeter Breach",
    description: "Motion sensor triggered at sector 4, east wall. Auto-response initiated.",
    timeAgo: "3m ago",
    signature: "4vJ9J8kL2pxQ",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldAlert size={14} />,
  },
  {
    id: "2",
    title: "HVAC Override Applied",
    description: "Climate control adjusted via night protocol automation.",
    timeAgo: "18m ago",
    signature: "9xQ1mB4v3nR7",
    status: "verified" as const,
    category: "Automation",
    icon: <Activity size={14} />,
  },
  {
    id: "3",
    title: "Surge Protection Triggered",
    description: "Voltage spike detected: 265V. Relay cutoff executed. Duration: 0.4s.",
    timeAgo: "1h ago",
    signature: "7tN5pC8x2wE1",
    status: "verified" as const,
    category: "System",
    icon: <Zap size={14} />,
  },
  {
    id: "4",
    title: "Main Gate Lock",
    description: "Gate lock relay activated from dashboard command center.",
    timeAgo: "2h ago",
    signature: "pending",
    status: "pending" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
  {
    id: "5",
    title: "Night Perimeter Sweep",
    description: "Scheduled sweep completed. All zones clear.",
    timeAgo: "6h ago",
    signature: "2kF8mC1v7bP4",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
];

const HOSPITAL_LOGS = [
  {
    id: "1",
    title: "ICU Ward Access Alert",
    description: "Unauthorised access attempt on Ward B-4. Badge verification failed. Security notified.",
    timeAgo: "4m ago",
    signature: "3rX7kP2mQw9L",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldAlert size={14} />,
  },
  {
    id: "2",
    title: "Surgery Room HVAC Override",
    description: "Sterile environment protocol engaged. Temperature lock applied for OR-3.",
    timeAgo: "22m ago",
    signature: "8yT5nF1vJc4R",
    status: "verified" as const,
    category: "Automation",
    icon: <Activity size={14} />,
  },
  {
    id: "3",
    title: "Pharmacy Voltage Spike",
    description: "Medical refrigerator circuit: 268V detected. Protective relay cutoff. Duration: 0.2s.",
    timeAgo: "1h ago",
    signature: "6mQ3pB8xZw2N",
    status: "verified" as const,
    category: "System",
    icon: <Zap size={14} />,
  },
  {
    id: "4",
    title: "Patient Zone Lock Applied",
    description: "Ward C isolation protocol activated from nursing station.",
    timeAgo: "2h ago",
    signature: "pending",
    status: "pending" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
  {
    id: "5",
    title: "Night Ward Sweep",
    description: "Scheduled security sweep completed. All patient wards clear.",
    timeAgo: "6h ago",
    signature: "4kH9mA2vRp7T",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
];

const INDUSTRIAL_LOGS = [
  {
    id: "1",
    title: "Production Floor Breach",
    description: "Perimeter sensor triggered at Sector 7, east assembly line. Automated lockout initiated.",
    timeAgo: "5m ago",
    signature: "5wN8pM3kXr1L",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldAlert size={14} />,
  },
  {
    id: "2",
    title: "Machinery Coolant Override",
    description: "Coolant flow adjusted via night maintenance protocol for CNC-Bay-4.",
    timeAgo: "20m ago",
    signature: "2tR6vJ9qBm5K",
    status: "verified" as const,
    category: "Automation",
    icon: <Activity size={14} />,
  },
  {
    id: "3",
    title: "Loading Bay Voltage Surge",
    description: "3-phase voltage spike detected: 487V. Relay cutoff executed. Duration: 0.6s.",
    timeAgo: "1h ago",
    signature: "9cP4xF7mWz3Q",
    status: "verified" as const,
    category: "System",
    icon: <Zap size={14} />,
  },
  {
    id: "4",
    title: "Control Room Access Lock",
    description: "SCADA control room relay locked from central command.",
    timeAgo: "2h ago",
    signature: "pending",
    status: "pending" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
  {
    id: "5",
    title: "Silo Night Sweep",
    description: "Scheduled overnight sweep completed. All sectors secured.",
    timeAgo: "6h ago",
    signature: "7bG2kN5vTs8X",
    status: "verified" as const,
    category: "Security",
    icon: <ShieldCheck size={14} />,
  },
];

export default function EventLogPage() {
  const [activeTab, setActiveTab] = useState<Tab>("All Logs");
  const { config } = useEnvironmentStore();

  const MOCK_LOGS =
    config.id === "hospital"
      ? HOSPITAL_LOGS
      : config.id === "industrial"
      ? INDUSTRIAL_LOGS
      : HOME_LOGS;

  const filtered = MOCK_LOGS.filter(
    (log) => activeTab === "All Logs" || log.category === activeTab
  );

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full h-full px-4 pt-4 pb-8"
    >
      {/* Chain Status Banner */}
      <div className="flex items-center justify-between bg-accent-teal/10 border border-accent-teal/30 rounded-lg px-4 py-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-accent-teal shadow-[0_0_5px_rgba(20,184,166,0.8)] animate-pulse" />
          <span className="text-xs font-bold text-accent-teal tracking-widest uppercase">Chain Status: Operational</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted uppercase">Solana Devnet</span>
      </div>

      {/* Environment Badge */}
      <div className={`self-start mb-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest border ${config.badgeBg} ${config.badgeBorder} ${config.badgeColor}`}>
        {config.name} · Event Log
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "flex-1 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded transition-all duration-200",
              activeTab === tab
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Real-Time Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {filtered.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <VerificationLogRow
              title={log.title}
              description={log.description}
              timeAgo={log.timeAgo}
              signature={log.signature}
              status={log.status}
              icon={log.icon}
            />
          </motion.div>
        ))}

        {/* Loading state */}
        <div className="flex items-center justify-center py-4 text-[10px] text-text-muted font-mono tracking-widest uppercase animate-pulse">
          <div className="w-2 h-2 rounded-full bg-accent-cyan/50 mr-2 animate-bounce" />
          Syncing Historical Blocks...
        </div>
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-20 right-4 w-12 h-12 bg-accent-cyan/10 border border-accent-cyan rounded-full flex items-center justify-center text-accent-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-accent-cyan/20 transition-colors z-30"
        aria-label="Expand event feed"
      >
        <ChevronDown size={20} />
      </button>
    </motion.div>
  );
}
