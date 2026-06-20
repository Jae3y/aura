"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Download, Shield, Smartphone } from "lucide-react";
import { useAuthStore } from '@/lib/stores/authStore';

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(5,5,5,0.98))] p-6 sm:p-10">
        <div className="max-w-3xl">
          <p className="section-label">AURA Command PWA</p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 text-4xl font-black uppercase leading-none text-white sm:text-6xl"
          >
            Autonomous Utility & Response Assistant
          </motion.h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            A mobile-first, installable security command center for monitoring devices,
            controlling environments, and escalating critical alerts through Alerta.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={isAuthenticated ? "/dashboard" : "/connect"}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-black uppercase text-black"
            >
              {isAuthenticated ? "Open dashboard" : "Connect and start"} <ArrowRight size={16} />
            </Link>
            <Link
              href="/alerta"
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-5 py-3 text-sm font-black uppercase text-red-200"
            >
              <AlertTriangle size={16} /> Alerta
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Smartphone, title: "Installable", body: "Add AURA to mobile home screens and launch it as a standalone PWA." },
          { icon: Download, title: "Offline Fallback", body: "Core assets are cached during production builds with a dedicated offline page." },
          { icon: Shield, title: "Shareable Ops", body: "Routes can be shared directly from mobile browsers while native apps are pending." },
        ].map((item) => (
          <div key={item.title} className="panel-card rounded-xl p-5">
            <item.icon className="h-7 w-7 text-cyan-300" />
            <h2 className="mt-4 text-lg font-bold text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{item.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
