"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Cpu, Fingerprint, ArrowRight, ChevronDown } from "lucide-react";
import { WalletGuard } from '@/components/auth/WalletGuard';
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ParticleField } from "@/components/ui/ParticleField";
import { HexGrid } from "@/components/ui/HexGrid";
import { ScanLine } from "@/components/ui/ScanLine";
import { GlitchText } from "@/components/ui/GlitchText";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants } from "@/lib/animations";

gsap.registerPlugin(useGSAP);

type AuthMethod = "ledger" | "biometric";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);
  const [initializing, setInitializing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // GSAP timeline for boot-up sequence
      const tl = gsap.timeline({ delay: 0.2 });
      tl.from(".gsap-boot-line", {
        opacity: 0,
        y: 8,
        stagger: 0.12,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  const handleNext = async () => {
    if (!selectedMethod || initializing) return;
    setInitializing(true);

    // GSAP initialization animation
    const tl = gsap.timeline();
    tl.to(".gsap-boot-line", { opacity: 0, y: -6, stagger: 0.04, duration: 0.2 });
    tl.to(".gsap-card", { scale: 1.02, duration: 0.15 }, "<");
    tl.to(".gsap-button", {
      background: "rgba(6,182,212,0.3)",
      duration: 0.3,
    });

    await new Promise((r) => setTimeout(r, 700));
    router.push("/dashboard");
  };

  return (
    <WalletGuard>
      <div ref={containerRef} className="relative flex flex-col w-full min-h-screen overflow-hidden bg-base" suppressHydrationWarning>
      {/* Cinematic background */}
      <div className="absolute inset-0 pointer-events-none">
        <HexGrid rows={10} cols={8} highlightIndices={[4, 11, 18, 25, 32, 39, 10, 22]} />
        <ParticleField count={50} color="#06B6D4" speed={0.25} connected />
        {/* Central glow */}
        <div className="absolute inset-0 bg-gradient-radial from-accent-cyan/5 via-transparent to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-base to-transparent" />
      </div>

      <motion.div
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative z-10 flex flex-col items-center px-6 py-10 h-full"
      >
        {/* Progress Indicator */}
        <div className="w-full flex flex-col items-center mb-10 gsap-boot-line">
          <div className="text-[9px] text-accent-cyan font-bold tracking-[0.25em] mb-3 uppercase">
            System Node: Initialize 01 / 04
          </div>
          <div className="w-full max-w-[180px] h-px bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "25%" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="h-full bg-accent-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            />
          </div>
        </div>

        {/* Hero Icon */}
        <div className="relative mb-8 gsap-boot-line">
          {/* Outer rotating rings */}
          {[100, 130, 165].map((size, i) => (
            <motion.div
              key={i}
              className="absolute border border-accent-cyan/20 rounded-full"
              style={{ width: size, height: size, top: `calc(50% - ${size / 2}px)`, left: `calc(50% - ${size / 2}px)` }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 12 + i * 5, repeat: Infinity, ease: "linear" }}
            />
          ))}

          {/* Subtle orbital dots */}
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_6px_rgba(6,182,212,1)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ top: -2, left: "50%", transformOrigin: "0 42px" }}
          />

          <motion.div
            animate={{
              boxShadow: [
                "0 0 15px rgba(6,182,212,0.1)",
                "0 0 40px rgba(6,182,212,0.3)",
                "0 0 15px rgba(6,182,212,0.1)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative w-20 h-20 rounded-full border border-accent-cyan/50 bg-accent-cyan/5 backdrop-blur-sm flex items-center justify-center"
          >
            <Shield size={36} className="text-accent-cyan drop-shadow-[0_0_12px_rgba(6,182,212,1)]" />
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center mb-10 gsap-boot-line" ref={titleRef}>
          <h1 className="font-heading text-4xl font-bold tracking-widest uppercase leading-tight mb-3">
            <span className="text-white">A New Era</span><br />
            <span className="text-white">Of </span>
            <GlitchText text="Security" color="cyan" size="lg" />
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[260px] mx-auto">
            Command your premises with military-grade precision and immutable blockchain verification.
          </p>
        </div>

        {/* Selection Cards */}
        <motion.div
          className="w-full space-y-4 mb-8"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          {(["ledger", "biometric"] as AuthMethod[]).map((method) => {
            const isSelected = selectedMethod === method;
            const Icon = method === "ledger" ? Cpu : Fingerprint;
            const label = method === "ledger" ? "Solana Ledger" : "Biometric ID";
            const sub = method === "ledger" ? "Hardware wallet connection" : "Local device authentication";

            return (
              <motion.div key={method} variants={staggerChildVariants} className="gsap-boot-line">
                <motion.button
                  onClick={() => setSelectedMethod(method)}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  className={clsx(
                    "w-full flex items-center p-4 border rounded-xl transition-all duration-300 relative overflow-hidden gsap-card",
                    isSelected
                      ? "bg-accent-cyan/10 border-accent-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "bg-card border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {isSelected && <ScanLine />}
                  <motion.div
                    animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors",
                      isSelected ? "bg-accent-cyan text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-zinc-800 text-text-secondary"
                    )}
                  >
                    <Icon size={18} />
                  </motion.div>
                  <div className="text-left">
                    <div className={clsx("font-bold tracking-widest text-sm uppercase", isSelected ? "text-accent-cyan" : "text-white")}>
                      {label}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>
                  </div>

                  {isSelected && (
                    <motion.div
                      className="ml-auto"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="w-5 h-5 rounded-full bg-accent-cyan flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-black" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <div className="w-full mt-auto">
          <AnimatePresence>
            {selectedMethod && (
              <motion.button
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={handleNext}
                disabled={initializing}
                className="gsap-button w-full flex items-center justify-center py-4 bg-white text-black font-bold tracking-widest uppercase rounded-xl hover:bg-zinc-100 disabled:opacity-70 transition-colors relative overflow-hidden"
              >
                {initializing ? (
                  <motion.div
                    className="flex items-center space-x-2"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <span>Initializing…</span>
                  </motion.div>
                ) : (
                  <>
                    <span>Initialize Hardware</span>
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          <div className="mt-6 flex flex-col items-center space-y-2">
            <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
              Encrypted by Solana Blockchain Protocol
            </p>
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown size={14} className="text-text-muted" />
            </motion.div>
          </div>
        </div>
      </motion.div>
      </div>
    </WalletGuard>
  );
}
