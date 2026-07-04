"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { LiskAuditBadge } from "@/components/ui/LiskAuditBadge";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants } from "@/lib/animations";
import { useDevices } from "@/lib/queries/useDevices";
import { useReports } from "@/lib/queries/useReports";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { toast } from "@/lib/toast";

export default function ReportsPage() {
  const { data: devices = [] } = useDevices();
  const primaryDeviceId = devices[0]?.id ?? "1";
  const { data: reports = [], isLoading, refetch, isFetching } = useReports(primaryDeviceId);
  const { config } = useEnvironmentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const formatReportMonth = (reportMonth: string) =>
    new Date(`${reportMonth}-01T00:00:00`).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });

  const handleDownload = async (reportId: string, pdfUrl: string | null, month: string) => {
    if (!pdfUrl) {
      toast.error("PDF not generated yet for this report");
      return;
    }
    setDownloading(reportId);
    try {
      // The backend redirect endpoint requires the auth header (Bearer token).
      // window.open doesn't send custom headers, so we use fetch with the
      // auth token, follow the redirect to the Supabase public URL, and
      // trigger a client-side download from the blob.
      const { session } = await import('@/lib/stores/authStore').then(m => m.useAuthStore.getState());
      const res = await fetch(`/api/reports/${reportId}/pdf`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        toast.error(text ? `Download failed (${res.status}): ${text}` : `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${month.replace('/', '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to direct Supabase public URL
      window.open(pdfUrl, "_blank");
    } finally {
      setDownloading(null);
    }
  };

  const totalThreats = reports.reduce((s, r) => s + (r.total_threats ?? 0), 0);
  const avgHealth = reports.length
    ? Math.round(reports.reduce((s, r) => s + (r.aura_health_score ?? 0), 0) / reports.length)
    : null;
  const auditedCount = reports.filter((r) => r.lisk_confirmed).length;

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <section className="panel-surface rounded-[28px] p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Monthly Compliance</p>
            <h2 className="mt-3 text-3xl font-bold uppercase tracking-[0.16em] text-white">
              Reports
            </h2>
            <p className="mt-3 text-text-secondary">
              Monthly {config.name} digests verified on Solana, compliance summaries synced to the Lisk audit protocol.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <LiskAuditBadge />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-text-muted hover:text-white transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </motion.button>
          </div>
        </div>
      </section>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      {reports.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-3"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          {[
            {
              label: `Total ${config.threatPlural}`,
              value: totalThreats,
              icon: AlertTriangle,
              color: "text-red-400",
              bg: "bg-red-500/10",
              border: "border-red-500/20",
            },
            {
              label: "Avg Health Score",
              value: avgHealth !== null ? `${avgHealth}/100` : "—",
              icon: TrendingUp,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
            },
            {
              label: "Lisk Audited",
              value: `${auditedCount}/${reports.length}`,
              icon: CheckCircle2,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
              border: "border-cyan-500/20",
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <motion.div
              key={label}
              variants={staggerChildVariants}
              className={`panel-card rounded-xl p-4 border ${border} ${bg}`}
            >
              <Icon className={`h-5 w-5 ${color} mb-2`} />
              <p className="text-xl font-bold text-white font-mono">{value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mt-1">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Report List ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading && (
          <div className="panel-card rounded-xl p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mx-auto w-8 h-8 rounded-full border-2 border-accent-cyan border-t-transparent mb-4"
            />
            <p className="text-sm text-text-secondary">Loading reports…</p>
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="panel-card rounded-[20px] p-10 text-center border border-dashed border-white/10"
          >
            <FileText className="mx-auto h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-bold text-white">No Reports Yet</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Generate a monthly report from a connected {config.device.toLowerCase()} to populate this view.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {reports.map((report, i) => {
            const isExpanded = expandedId === report.id;
            const isDownloading = downloading === report.id;

            return (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`panel-card rounded-[20px] overflow-hidden border ${
                  report.lisk_confirmed ? "border-emerald-500/15" : "border-amber-500/15"
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        report.lisk_confirmed
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                      }`}>
                        <FileText size={16} className={report.lisk_confirmed ? "text-emerald-400" : "text-amber-400"} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          {formatReportMonth(report.report_month)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={10} className="text-text-muted" />
                          <span className="text-[10px] text-text-muted font-mono">
                            {report.total_threats} {config.threatPlural.toLowerCase()} · {report.surges_blocked} surges
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {report.lisk_confirmed ? (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                          <CheckCircle2 size={9} /> Audited
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                          <Clock size={9} /> Pending
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp size={14} className="text-text-muted" />
                        : <ChevronDown size={14} className="text-text-muted" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-4">
                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { label: "Health Score", value: `${report.aura_health_score ?? "—"}/100`, icon: Shield },
                            { label: "Avg Voltage", value: `${report.avg_voltage?.toFixed(1) ?? "—"}V`, icon: Zap },
                            { label: "Anomalies", value: report.total_anomalies ?? "—", icon: AlertTriangle },
                            { label: "Solana Events", value: report.solana_events_logged ?? "—", icon: TrendingUp },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                              <Icon size={12} className="text-text-muted mb-1" />
                              <p className="text-sm font-bold text-white font-mono">{value}</p>
                              <p className="text-[9px] text-text-muted uppercase tracking-widest mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Lisk TX */}
                        {report.lisk_tx_id && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Lisk TX</p>
                            {report.lisk_tx_id.startsWith('lisk-local-') ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted border border-white/10 bg-white/5 rounded px-2 py-1">
                                Local dev — configure LISK_RPC_URL for testnet
                              </span>
                            ) : (
                              <a
                                href={`https://sepolia-explorer.lisk.com/tx/${report.lisk_tx_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-mono text-accent-cyan hover:underline"
                              >
                                {report.lisk_tx_id.slice(0, 20)}… <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        )}


                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={!report.pdf_url || isDownloading}
                            onClick={() => handleDownload(report.id, report.pdf_url, report.report_month)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs font-bold uppercase tracking-widest hover:bg-cyan-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isDownloading ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                            {report.pdf_url ? "Download PDF" : "PDF Unavailable"}
                          </motion.button>
                          {report.lisk_confirmed && (
                            <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/5 text-emerald-300 text-xs font-bold uppercase tracking-widest">
                              <CheckCircle2 size={12} /> Lisk Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
