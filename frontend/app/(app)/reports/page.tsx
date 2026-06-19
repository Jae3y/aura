"use client";

import { motion } from "framer-motion";
import { Download, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { LiskAuditBadge } from "@/components/ui/LiskAuditBadge";
import { pageTransitionVariants } from "@/lib/animations";

const REPORTS = [
  { id: "may-2026", month: "May 2026", events: 248, surges: 11, audited: true },
  { id: "apr-2026", month: "April 2026", events: 192, surges: 8, audited: true },
  { id: "mar-2026", month: "March 2026", events: 301, surges: 14, audited: true },
  { id: "feb-2026", month: "February 2026", events: 157, surges: 5, audited: false },
];

export default function ReportsPage() {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full px-4 pt-4 pb-8 space-y-6"
    >
      {/* Header summary */}
      <div className="bg-card border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[9px] text-text-muted font-bold tracking-widest uppercase mb-1">Monthly Compliance</div>
            <h2 className="text-xl font-heading font-bold text-white tracking-widest uppercase">Reports</h2>
          </div>
          <LiskAuditBadge />
        </div>
        <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
          Monthly activity digests verified via Solana, with compliance summaries synced to the Lisk audit protocol.
        </p>
      </div>

      {/* Report List */}
      <div className="flex flex-col space-y-3">
        {REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card border border-zinc-800 rounded-xl p-4 flex flex-col space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-lg">
                  <FileText size={18} className="text-text-secondary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wider">{report.month}</div>
                  <div className="flex items-center text-[10px] text-text-muted font-mono mt-0.5">
                    <Calendar size={10} className="mr-1" />
                    {report.events} events · {report.surges} surges
                  </div>
                </div>
              </div>

              {report.audited ? (
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center text-[9px] font-bold text-accent-teal uppercase tracking-widest">
                    <CheckCircle2 size={10} className="mr-1" />
                    Audited
                  </div>
                  <LiskAuditBadge />
                </div>
              ) : (
                <div className="text-[9px] font-bold text-accent-warning bg-accent-warning/10 border border-accent-warning/30 px-2 py-0.5 rounded uppercase tracking-widest">
                  Pending Audit
                </div>
              )}
            </div>

            <button
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] text-text-secondary font-bold tracking-widest uppercase hover:bg-zinc-800 hover:text-white transition-colors"
              aria-label={`Download ${report.month} report PDF`}
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
