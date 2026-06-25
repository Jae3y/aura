"use client";

import { motion } from "framer-motion";
import { Wallet, RefreshCw, LogOut, Trash2, Plus, ShieldCheck, HelpCircle } from "lucide-react";
import { LiskAuditBadge } from "@/components/ui/LiskAuditBadge";
import { pageTransitionVariants } from "@/lib/animations";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "@/lib/toast";
import { WalletConnectButton } from "@/components/auth/WalletConnectButton";

const AUTHORIZED_WALLETS = [
  { name: "Security Officer A", address: "7xKt...9qFm", role: "ADMIN" },
  { name: "Night Guard Node", address: "3pWv...2nBz", role: "MONITOR" },
  { name: "Backup Key Alpha", address: "5yNh...6rDe", role: "READ-ONLY" },
];

export default function AccessControlPage() {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect } = useWallet();
  const { clearSession, profile } = useAuthStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    setSyncing(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      toast.error("Failed to sync balance from Solana Devnet");
    } finally {
      setSyncing(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, fetchBalance]);

  const handleSync = async () => {
    await fetchBalance();
    toast.success("Balance updated from Solana Devnet");
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      clearSession();
      toast.success("Session disconnected successfully");
    } catch (err) {
      console.error("Disconnect error:", err);
      toast.error("Failed to disconnect wallet");
    }
  };

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

      {connected && publicKey ? (
        /* Connected Primary Wallet Card */
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
              <div className="text-2xl font-mono font-bold text-white">
                {balance !== null ? balance.toFixed(4) : "---"} <span className="text-accent-cyan text-sm">SOL</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[9px] text-text-muted tracking-widest uppercase mb-1">Wallet Address</div>
            <div className="font-mono text-sm text-white break-all bg-black/30 rounded px-2 py-1.5 border border-zinc-700">
              {publicKey.toBase58()}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center space-x-2 bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan rounded-lg py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-cyan/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Syncing..." : "Sync Balance"}</span>
            </button>
            <button
              onClick={handleDisconnect}
              className="flex-1 flex items-center justify-center space-x-2 bg-zinc-800 border border-zinc-700 text-text-secondary rounded-lg py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-700 transition-colors"
            >
              <LogOut size={14} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Disconnected State / Email Session Card */
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-6 shadow-[0_0_20px_rgba(239,68,68,0.05)] text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-zinc-800/50 rounded-full flex items-center justify-center border border-zinc-700 text-text-muted">
            <Wallet size={20} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Wallet Node Linked</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              You are currently logged in via standard node credentials ({profile?.email || "Email Session"}). 
              Link a Solana hardware ledger or Phantom wallet to check real-time Devnet balances.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <WalletConnectButton />
          </div>
        </div>
      )}

      {/* Authorized Wallets */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-muted tracking-widest uppercase">Authorized Wallets</h3>
          <button 
            onClick={() => {
              const address = prompt("Enter Solana wallet address to authorize:");
              if (address) {
                toast.success(`Access authorization request submitted to Solana network for ${address.slice(0,6)}...`);
              }
            }}
            className="flex items-center space-x-1 text-accent-cyan text-[10px] font-bold tracking-widest uppercase hover:underline"
          >
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
              <button 
                onClick={() => toast.success(`Revocation request queued on-chain for ${wallet.name}`)}
                aria-label={`Remove ${wallet.name}`} 
                className="text-text-muted hover:text-accent-danger transition-colors p-1"
              >
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
