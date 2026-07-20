"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  AlertTriangle,
  Loader2,
  Shield,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants } from "@/lib/animations";
import { useDevices } from "@/lib/queries/useDevices";
import { useDeviceNFT, useSolanaEvents, useWalletAccess } from "@/hooks/useBlockchain";
import { toast } from "@/lib/toast";
import { useState } from "react";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

type SigState = 'none' | 'placeholder' | 'invalid' | 'unconfirmed' | 'confirmed';

function classifySig(sig: string | null | undefined, confirmed?: boolean): SigState {
  if (!sig) return 'none';
  if (sig.length < 32) return 'placeholder';          // mock / queued, not yet written on-chain
  if (sig.length > 88 || !BASE58_RE.test(sig)) return 'invalid'; // malformed
  if (!confirmed) return 'unconfirmed';               // valid format, awaiting confirmation
  return 'confirmed';
}

function SignatureChip({ sig, slot, confirmed }: { sig: string | null; slot?: number | null; confirmed?: boolean }) {
  const state = classifySig(sig, confirmed);

  if (state === 'none') return (
    <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-300">
      <Loader2 className="h-3 w-3 animate-spin" /> Pending
    </span>
  );

  if (state === 'placeholder') return (
    <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-300">
      <Clock className="h-3 w-3" /> Queued
    </span>
  );

  if (state === 'invalid') return (
    <span className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-[10px] font-bold text-red-300">
      <AlertTriangle className="h-3 w-3" /> Invalid format
    </span>
  );

  if (state === 'unconfirmed') return (
    <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-300">
      <Loader2 className="h-3 w-3 animate-spin" /> Confirming…
    </span>
  );

  // confirmed — full interactive badge
  const short = `${sig!.slice(0, 6)}…${sig!.slice(-6)}`;
  const href = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline" title={slot ? `Slot ${slot}` : 'View on Solana'}>
        {short}
      </a>
      <button type="button" onClick={() => { navigator.clipboard.writeText(sig!); toast.success("Signature copied"); }} className="rounded p-0.5 hover:bg-emerald-500/20" aria-label="Copy signature">
        <Copy className="h-3 w-3" />
      </button>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open in explorer">
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function BlockchainLedgerPage() {
  const { data: devices = [] } = useDevices();
  const device = devices[0] ?? null;
  const { data: events = [], isLoading: eventsLoading } = useSolanaEvents(device?.id ?? null);
  const { data: nft } = useDeviceNFT(device?.id ?? null);
  const { data: access } = useWalletAccess(device?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const verifiedCount = events.filter((e) => classifySig(e.solana_signature, e.solana_confirmed) === 'confirmed').length;
  const pendingCount = events.filter((e) => ['none', 'placeholder', 'unconfirmed'].includes(classifySig(e.solana_signature, e.solana_confirmed))).length;
  const invalidCount = events.filter((e) => classifySig(e.solana_signature, e.solana_confirmed) === 'invalid').length;

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <p className="section-label">Solana Devnet</p>
        <h2 className="mt-3 text-3xl font-bold uppercase tracking-[0.16em] text-white">
          Blockchain Ledger
        </h2>
        <p className="mt-3 text-text-secondary">
          Every relay action, security event, and system change is permanently recorded on Solana.
          Each entry is independently verifiable — click any signature to prove it on-chain.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Solana Devnet · Live
          </span>
          <span className="text-[10px] text-text-muted font-mono">
            All transactions verifiable at explorer.solana.com
          </span>
        </div>
      </section>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={staggerParentVariants}
        initial="initial"
        animate="animate"
      >
        {[
          { label: "Verified On-Chain", value: verifiedCount, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
          { label: "Pending Confirm", value: pendingCount, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
          { label: "Invalid Sig", value: invalidCount, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <motion.div key={label} variants={staggerChildVariants} className={`panel-card rounded-xl p-4 border ${border} ${bg}`}>
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mt-1">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Device NFT Card ────────────────────────────────────────── */}
      {device && (
        <section className="panel-card rounded-[20px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-3">Device Identity NFT</h3>
              {nft?.mintAddress || device.nft_mint_address ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">NFT Minted</span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300">Verified</span>
                  </div>
                  <p className="text-xs font-mono text-text-muted break-all">
                    {nft?.mintAddress || device.nft_mint_address}
                  </p>
                  {(nft?.explorerUrl) && (
                    <a
                      href={nft.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent-cyan hover:underline"
                    >
                      View NFT on Solana Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">NFT Not Minted</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    This device has not been paired to a Solana Identity NFT yet. Pair a physical device or register a node to trigger NFT minting.
                  </p>
                  <Link href="/devices" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-cyan hover:underline">
                    Go to Devices <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!device && (
        <section className="panel-card rounded-[20px] p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-bold text-white">No Device Registered</h3>
          <p className="mt-2 text-sm text-text-secondary">Register a device to start recording blockchain events.</p>
          <Link href="/devices" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20 transition-colors">
            Register a Device
          </Link>
        </section>
      )}

      {/* ── On-Chain Event Ledger ───────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
            On-Chain Events ({events.length})
          </h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-[10px] text-accent-cyan font-bold uppercase tracking-widest"
          >
            <RefreshCw size={10} /> Sync
          </motion.button>
        </div>

        {eventsLoading && (
          <div className="panel-card rounded-xl p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent-cyan mb-3" />
            <p className="text-sm text-text-secondary">Fetching on-chain events…</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {events.map((event, index) => {
            const isExpanded = expandedId === event.id;
            const sigState = classifySig(event.solana_signature, event.solana_confirmed);
            const verified = sigState === 'confirmed';
            const pending = sigState !== 'invalid';
            const isInvalid = sigState === 'invalid';

            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`panel-card rounded-[20px] overflow-hidden border ${
                  verified ? "border-emerald-500/20" : pending ? "border-amber-500/20" : "border-red-500/20"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${
                        verified ? "bg-emerald-500/10" : pending ? "bg-amber-500/10" : "bg-red-500/10"
                      }`}>
                        {verified ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                          pending ? <Clock className="h-4 w-4 text-amber-400" /> :
                            <AlertTriangle className="h-4 w-4 text-red-400" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {event.event_type.replace(/_/g, " ").toUpperCase()}
                        </h4>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(event.occurred_at).toLocaleString()} · {device?.id ?? ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SignatureChip sig={event.solana_signature} slot={event.solana_slot} confirmed={event.solana_confirmed} />
                      {isExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-4">
                        {event.solana_signature && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Full Signature</p>
                            <div className="flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-lg p-3">
                              <code className="text-[10px] font-mono text-text-secondary break-all flex-1">{event.solana_signature}</code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(event.solana_signature!); toast.success("Copied"); }}
                                className="shrink-0 text-text-muted hover:text-white transition-colors"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                        {event.solana_slot && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Slot</p>
                            <p className="text-xs font-mono text-white">{event.solana_slot.toLocaleString()}</p>
                          </div>
                        )}
                          {verified && event.solana_signature && (
                            <a
                              href={`https://explorer.solana.com/tx/${event.solana_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-bold uppercase hover:bg-emerald-400/20 transition-colors"
                            >
                              <Link2 size={12} /> Verify On-Chain
                            </a>
                          )}
                          {sigState === 'placeholder' && (
                            <div className="flex items-center gap-2 text-xs text-amber-400">
                              <Clock size={12} />
                              Queued — Solana write in progress, signature pending
                            </div>
                          )}
                          {isInvalid && (
                            <div className="flex items-center gap-2 text-xs text-red-400">
                              <AlertTriangle size={12} />
                              Signature format invalid — devnet data gap or corrupted entry
                            </div>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!eventsLoading && events.length === 0 && device && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="panel-card rounded-[20px] p-10 text-center"
          >
            <Zap className="mx-auto h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-bold text-white">No On-Chain Events Yet</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Simulate a threat or run an audit from Settings to start recording blockchain events.
            </p>
            <Link href="/settings" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-400/20 transition-colors">
              Go to Settings
            </Link>
          </motion.div>
        )}
      </section>

      {/* ── Wallet Access Grants ────────────────────────────────────── */}
      {access?.grants && access.grants.length > 0 && (
        <section className="panel-card rounded-[20px] p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-4">Wallet Access Grants</h3>
          <div className="space-y-2">
            {access.grants.map((grant) => (
              <div key={grant.grantee_wallet} className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <code className="text-xs font-mono text-text-secondary break-all">{grant.grantee_wallet}</code>
                <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">Active</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
