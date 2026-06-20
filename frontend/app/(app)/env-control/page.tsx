"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Server, Globe, CheckCircle2, Wifi, Lock, LockOpen } from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";

type Environment = "home" | "hospital" | "industrial";

const environments = [
  {
    id: "home" as Environment,
    name: "Home Environment",
    icon: Globe,
    description: "Residential security and automation",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/30",
  },
  {
    id: "hospital" as Environment,
    name: "Hospital Facility",
    icon: Shield,
    description: "Medical-grade security and monitoring",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  {
    id: "industrial" as Environment,
    name: "Industrial Site",
    icon: Server,
    description: "Heavy industry and manufacturing",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
];

export default function EnvControlPage() {
  const [activeEnv, setActiveEnv] = useState<Environment>("home");

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8"
    >
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <p className="section-label">Environment Control</p>
        <h2 className="mt-4 text-3xl font-bold uppercase tracking-[0.16em] text-white">
          Select Operational Mode
        </h2>
        <p className="mt-4 text-text-secondary">
          Choose the environment type to optimize security, automation, and monitoring
          parameters for your specific use case.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {environments.map((env, index) => (
          <motion.button
            key={env.id}
            whileHover={{ scale: activeEnv === env.id ? 1 : 1.02 }}
            whileTap={{ scale: activeEnv === env.id ? 1 : 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setActiveEnv(env.id)}
            className={`panel-card rounded-[24px] p-6 text-left transition-all ${
              activeEnv === env.id
                ? `${env.bg} ${env.border}`
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <env.icon className={`h-10 w-10 ${env.color}`} />
              {activeEnv === env.id && (
                <div className="h-4 w-4 rounded-full bg-emerald-500" />
              )}
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">{env.name}</h3>
            <p className="mt-2 text-sm text-text-secondary">{env.description}</p>
          </motion.button>
        ))}
      </section>

      {activeEnv && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-card rounded-[24px] p-6"
        >
          <h3 className="text-lg font-bold text-white mb-6">
            Environment Configuration
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Security Level
              </p>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <span className="text-white">
                  {activeEnv === "hospital" ? "Maximum" : activeEnv === "industrial" ? "High" : "Standard"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Network Mode
              </p>
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-cyan-400" />
                <span className="text-white">
                  {activeEnv === "home" ? "WiFi Only" : "Dual Stack"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Monitoring Priority
              </p>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-orange-400" />
                <span className="text-white">
                  {activeEnv === "hospital" ? "Patient Safety" : activeEnv === "industrial" ? "Equipment" : "Residents"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Database Replication
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-400" />
                <span className="text-white">
                  {activeEnv === "industrial" ? "Real-time" : "Hourly"}
                </span>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
