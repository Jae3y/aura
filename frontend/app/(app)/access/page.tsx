"use client";

import { motion } from "framer-motion";
import { Wallet, RefreshCw, LogOut, Trash2, Plus, ShieldCheck } from "lucide-react";
import { LiskAuditBadge } from "@/components/ui/LiskAuditBadge";
import { pageTransitionVariants } from "@/lib/animations";

const AUTHORIZED_WALLETS = [
  { name: "Security Officer A", address: "7xKt...9qFm", role: "ADMIN" },
  { name: "Night Guard Node", address: "3pWv...2nBz", role: "MONITOR" },
  { name: "Backup Key Alpha", address: "5yNh...6rDe", role: "READ-ONLY" },
];

export default function AccessControlPage() {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6"
    >
      {/* Network Status */}
      <div className="flex items-center justify-between px-4 py-2 bg-accent-teal/10 border border-accent-teal/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-accent-teal shadow-[0_0_6px_rgba(20,184,166,1)] animate-pulse" />
          <span className="text-xs text-accent-teal font-bold tracking-widest uppercase">Solana Devnet Online</span>
        </div>
        <ShieldCheck size={16} className="text-accent-teal" />
      </div>

      {/* Primary Wallet Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-zinc-700 p-5 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        {/* Decorative glow ring */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[9px] text-text-muted font-bold tracking-[0.2em] uppercase mb-1">Master Wallet</div>
            <div className="flex items-center space-x-2">
              <Wallet size={18} className="text-accent-cyan" />
              <span className="text-lg font-heading font-bold text-white tracking-wider">AURA Prime</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-text-muted tracking-widest uppercase">Balance</div>
            <div className="text-2xl font-mono font-bold text-white">12.40 <span className="text-accent-cyan text-sm">SOL</span></div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-[9px] text-text-muted tracking-widest uppercase mb-1">Wallet Address</div>
          <div className="font-mono text-sm text-white break-all bg-black/30 rounded px-2 py-1.5 border border-zinc-700">
            7xKtAbcDeFgHiJkLmNoPqRsT...9qFmV2Z
          </div>
        </div>

        <div className="flex space-x-3">
          <button className="flex-1 flex items-center justify-center space-x-2 bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan rounded-lg py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-cyan/20 transition-colors">
            <RefreshCw size={14} />
            <span>Sync Balance</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-2 bg-zinc-800 border border-zinc-700 text-text-secondary rounded-lg py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-700 transition-colors">
            <LogOut size={14} />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Authorized Wallets */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Authorized Wallets</h3>
          <button className="flex items-center space-x-1 text-accent-cyan text-[10px] font-bold tracking-widest uppercase hover:underline">
            <Plus size={12} />
            <span>Authorize New</span>
          </button>
        </div>

        <div className="space-y-2">
          {AUTHORIZED_WALLETS.map((wallet) => (
            <div key={wallet.address} className="flex items-center justify-between bg-card border border-zinc-800 rounded-lg px-4 py-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-bold text-white">{wallet.name}</span>
                  <span className="text-[9px] font-bold tracking-widest border border-zinc-700 px-1.5 py-0.5 rounded text-text-muted uppercase">{wallet.role}</span>
                </div>
                <div className="font-mono text-[10px] text-text-muted">{wallet.address}</div>
              </div>
              <button aria-label={`Remove ${wallet.name}`} className="text-text-muted hover:text-accent-danger transition-colors p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer Card */}
      <div className="bg-card border border-zinc-800 rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-text-muted leading-relaxed">
          All wallet authorizations and relay commands are logged as smart contract events on the <span className="text-accent-cyan">Solana blockchain</span>. Access changes require multi-signature confirmation.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[9px] text-text-muted font-mono uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-accent-teal" />
            Powered by Solana
          </div>
          {/* Lisk Audit Badge - secondary compliance marker */}
          <LiskAuditBadge />
        </div>
      </div>
    </motion.div>
  );
}
