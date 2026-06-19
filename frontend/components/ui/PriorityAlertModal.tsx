"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { modalEntryVariants, pulseAlertVariants } from "@/lib/animations";

interface PriorityAlertModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  location?: string;
  onAuthorize: () => void;
  onDismiss: () => void;
}

export function PriorityAlertModal({
  isOpen,
  title,
  description,
  location,
  onAuthorize,
  onDismiss,
}: PriorityAlertModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            variants={modalEntryVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-sm bg-black border border-accent-danger rounded-xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] relative overflow-hidden"
          >
            {/* Background warning stripes effect could go here */}
            
            <div className="flex flex-col items-center text-center">
              <motion.div variants={pulseAlertVariants} animate="animate" className="rounded-full bg-accent-danger/20 p-4 mb-4 text-accent-danger">
                <ShieldAlert size={48} />
              </motion.div>
              
              {/* CSS glitch effect would be applied to this text in globals or a module */}
              <h2 className="text-2xl font-heading font-bold text-accent-danger uppercase tracking-widest mb-2 animate-pulse">
                {title}
              </h2>
              
              {location && (
                <div className="text-xs font-mono bg-accent-danger/10 text-accent-danger px-3 py-1 rounded border border-accent-danger/30 mb-4 uppercase">
                  {location}
                </div>
              )}
              
              <p className="text-sm text-zinc-300 mb-8 font-mono">
                {description}
              </p>
              
              <div className="w-full space-y-3">
                <button
                  onClick={onAuthorize}
                  className="w-full py-3 bg-accent-danger text-white font-bold tracking-widest uppercase rounded hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  Authorize Force
                </button>
                <button
                  onClick={onDismiss}
                  className="w-full py-3 bg-transparent border border-zinc-700 text-zinc-400 font-bold tracking-widest uppercase rounded hover:bg-zinc-900 transition-colors"
                >
                  Dismiss Alert
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
