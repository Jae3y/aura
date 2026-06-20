"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Mail, Shield, User, Wallet } from "lucide-react";
import { pageTransitionVariants } from "@/lib/animations";
import { useAuthStore } from "@/lib/stores/authStore";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, walletAddress, session, clearSession } = useAuthStore();

  const handleSignOut = () => {
    clearSession();
    router.push("/connect");
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <section className="panel-surface rounded-xl p-6">
        <p className="section-label">Operator Profile</p>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
              <User size={30} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {profile?.full_name || "Aura Operator"}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{profile?.email || "Local authenticated session"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-200"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-card rounded-xl p-5">
          <Mail className="h-6 w-6 text-cyan-300" />
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">Email Alerts</p>
          <p className="mt-2 text-lg font-bold text-white">{profile?.notification_email ? "Enabled" : "Not configured"}</p>
        </div>
        <div className="panel-card rounded-xl p-5">
          <Wallet className="h-6 w-6 text-emerald-300" />
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">Wallet</p>
          <p className="mt-2 truncate text-lg font-bold text-white">{walletAddress || profile?.wallet_address || "Not linked"}</p>
        </div>
        <div className="panel-card rounded-xl p-5">
          <Shield className="h-6 w-6 text-amber-300" />
          <p className="mt-4 text-xs uppercase tracking-[0.22em] text-text-muted">Session</p>
          <p className="mt-2 text-lg font-bold text-white">{session ? "Active" : "Local only"}</p>
        </div>
      </section>

      <section className="panel-card rounded-xl p-5">
        <h3 className="text-base font-bold text-white">Personal Controls</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Identity and session controls live here. System-level behavior has moved to Settings.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/settings" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-text-secondary hover:text-white">
            System settings
          </Link>
          <Link href="/access" className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">
            Access control
          </Link>
        </div>
      </section>
    </motion.div>
  );
}
