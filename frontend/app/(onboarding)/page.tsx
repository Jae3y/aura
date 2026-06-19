"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Cpu, Fingerprint, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { pageTransitionVariants } from "@/lib/animations";

type AuthMethod = "ledger" | "biometric";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);

  const handleNext = () => {
    if (selectedMethod) {
      router.push("/dashboard"); // Redirecting to dashboard for now
    }
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex flex-col items-center px-6 py-8"
    >
      {/* Progress Indicator */}
      <div className="w-full flex flex-col items-center mb-12">
        <div className="text-[10px] text-accent-cyan font-bold tracking-[0.2em] mb-3 uppercase">
          System Node: Initialize 01 / 04
        </div>
        <div className="w-full max-w-[200px] h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-accent-cyan w-1/4 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative mb-8">
          <motion.div
            animate={{ boxShadow: ["0 0 20px rgba(6,182,212,0.2)", "0 0 40px rgba(6,182,212,0.4)", "0 0 20px rgba(6,182,212,0.2)"] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 rounded-full border border-accent-cyan/30 bg-accent-cyan/5 flex items-center justify-center"
          >
            <Shield size={40} className="text-accent-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          </motion.div>
        </div>
        
        <h1 className="font-heading text-3xl font-bold tracking-widest uppercase mb-4 text-white">
          A New Era Of<br />
          <span className="text-accent-cyan">Security.</span>
        </h1>
        
        <p className="text-sm text-text-secondary leading-relaxed max-w-[280px]">
          Command your premises with military-grade precision and immutable blockchain verification.
        </p>
      </div>

      {/* Selection Cards */}
      <div className="w-full space-y-4 mb-auto">
        <button
          onClick={() => setSelectedMethod("ledger")}
          className={clsx(
            "w-full flex items-center p-4 border rounded-xl transition-all duration-200",
            selectedMethod === "ledger"
              ? "bg-accent-cyan/10 border-accent-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              : "bg-card border-zinc-800 hover:border-zinc-700 hover:bg-card-hover"
          )}
        >
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center mr-4",
            selectedMethod === "ledger" ? "bg-accent-cyan text-black" : "bg-zinc-800 text-text-secondary"
          )}>
            <Cpu size={20} />
          </div>
          <div className="text-left">
            <div className={clsx("font-bold tracking-widest text-sm uppercase", selectedMethod === "ledger" ? "text-accent-cyan" : "text-white")}>
              Solana Ledger
            </div>
            <div className="text-xs text-text-muted mt-1">Hardware wallet connection</div>
          </div>
        </button>

        <button
          onClick={() => setSelectedMethod("biometric")}
          className={clsx(
            "w-full flex items-center p-4 border rounded-xl transition-all duration-200",
            selectedMethod === "biometric"
              ? "bg-accent-cyan/10 border-accent-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              : "bg-card border-zinc-800 hover:border-zinc-700 hover:bg-card-hover"
          )}
        >
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center mr-4",
            selectedMethod === "biometric" ? "bg-accent-cyan text-black" : "bg-zinc-800 text-text-secondary"
          )}>
            <Fingerprint size={20} />
          </div>
          <div className="text-left">
            <div className={clsx("font-bold tracking-widest text-sm uppercase", selectedMethod === "biometric" ? "text-accent-cyan" : "text-white")}>
              Biometric ID
            </div>
            <div className="text-xs text-text-muted mt-1">Local device authentication</div>
          </div>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="w-full mt-8">
        <button
          onClick={handleNext}
          disabled={!selectedMethod}
          className="w-full flex items-center justify-center py-4 bg-white text-black font-bold tracking-widest uppercase rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>Initialize Hardware</span>
          <ArrowRight size={18} className="ml-2" />
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
            Encrypted by Solana Blockchain Protocol
          </p>
        </div>
      </div>
    </motion.div>
  );
}
