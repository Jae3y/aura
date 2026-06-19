"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, CheckCircle2, Clock, Zap } from "lucide-react";
import { SolanaExplorerBadge } from "@/components/ui/SolanaExplorerBadge";
import { GlitchText } from "@/components/ui/GlitchText";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants, toastVariants } from "@/lib/animations";
import { clsx } from "clsx";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const RECENT_COMMANDS = [
  { id: "1", text: "Activate perimeter scan", confidence: 97, signature: "4vJ9...kL2p", time: "2m ago", ok: true },
  { id: "2", text: "Turn off living room lights", confidence: 99, signature: "9xQ1...mB4v", time: "8m ago", ok: true },
  { id: "3", text: "Lock main gate", confidence: 94, signature: "7tN5...pC8x", time: "15m ago", ok: true },
];

const BAR_COUNT = 32;

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const rafRef = useRef<number>(0);

  // GSAP waveform animation
  useGSAP(
    () => {
      if (listening) {
        tlRef.current = gsap.timeline({ repeat: -1 });
        Array.from({ length: BAR_COUNT }).forEach((_, i) => {
          tlRef.current!.to(
            `.waveBar-${i}`,
            {
              scaleY: 0.2 + Math.random() * 0.8,
              duration: 0.08 + Math.random() * 0.1,
              ease: "sine.inOut",
              yoyo: true,
              repeat: 3,
            },
            i * 0.015
          );
        });
      } else {
        tlRef.current?.kill();
        gsap.to("[class*='waveBar-']", {
          scaleY: 0.1,
          duration: 0.4,
          ease: "power2.out",
        });
      }
    },
    { scope: barsRef, dependencies: [listening] }
  );

  const handleMicClick = () => {
    if (listening) {
      setListening(false);
      // Simulate a recognized command
      const cmds = ["Engage surveillance mode", "Activate motion detection", "Set alert threshold 80%"];
      setLastCommand(cmds[Math.floor(Math.random() * cmds.length)]);
      setTimeout(() => setLastCommand(null), 3000);
    } else {
      setListening(true);
    }
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex flex-col w-full h-full px-4 pt-4 pb-8 items-center"
    >
      {/* Status Indicator */}
      <div className="w-full flex justify-center mb-6 h-8">
        <AnimatePresence mode="wait">
          {listening ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="flex items-center space-x-2"
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-accent-danger"
              />
              <GlitchText text="Listening..." color="red" size="sm" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="text-xs text-text-muted font-bold tracking-widest uppercase"
            >
              Tap to Activate
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Waveform Visualizer (GSAP) */}
      <div
        ref={barsRef}
        className="w-full max-w-xs h-20 flex items-center justify-center space-x-[3px] mb-8"
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              `waveBar-${i}`,
              "rounded-full transition-colors duration-300",
              listening ? "bg-accent-cyan" : "bg-zinc-700"
            )}
            style={{
              width: 4,
              height: 32,
              transform: "scaleY(0.1)",
              transformOrigin: "center",
            }}
          />
        ))}
      </div>

      {/* Activation Button */}
      <motion.button
        onClick={handleMicClick}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        aria-label={listening ? "Stop listening" : "Start listening"}
        className={clsx(
          "relative w-22 h-22 rounded-full border-2 flex items-center justify-center transition-all duration-300 mb-8",
          listening
            ? "bg-accent-danger/10 border-accent-danger text-accent-danger"
            : "bg-zinc-900 border-zinc-700 text-text-secondary hover:border-accent-cyan hover:text-accent-cyan"
        )}
        style={{ width: 88, height: 88 }}
      >
        {/* Concentric pulse rings when listening */}
        <AnimatePresence>
          {listening && [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-accent-danger"
              animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
              style={{ inset: 0 }}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {listening ? (
            <motion.div key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <MicOff size={30} />
            </motion.div>
          ) : (
            <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic size={30} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Toast: recognized command */}
      <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <AnimatePresence>
          {lastCommand && (
            <motion.div
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center space-x-3 bg-card border border-accent-teal/40 rounded-xl px-4 py-3 shadow-[0_0_20px_rgba(20,184,166,0.2)]"
            >
              <Zap size={16} className="text-accent-teal shrink-0" />
              <div>
                <div className="text-[10px] text-accent-teal font-bold tracking-widest uppercase">Command Recognized</div>
                <div className="text-sm text-white font-medium">&ldquo;{lastCommand}&rdquo;</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Commands */}
      <div className="w-full flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Recent Commands</h3>
          <span className="text-[9px] font-mono text-text-muted uppercase">Chain Verified</span>
        </div>

        <motion.div
          className="space-y-3"
          variants={staggerParentVariants}
          initial="initial"
          animate="animate"
        >
          {RECENT_COMMANDS.map((cmd) => (
            <motion.div
              key={cmd.id}
              variants={staggerChildVariants}
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="bg-card border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-accent-teal shrink-0" />
                  <span className="text-sm font-bold text-white">&ldquo;{cmd.text}&rdquo;</span>
                </div>
                <div className="text-[9px] font-mono text-accent-cyan font-bold bg-accent-cyan/10 px-1.5 py-0.5 rounded">{cmd.confidence}%</div>
              </div>
              <div className="flex items-center justify-between pl-6">
                <div className="flex items-center text-[10px] text-text-muted font-mono">
                  <Clock size={10} className="mr-1" />
                  {cmd.time}
                </div>
                <SolanaExplorerBadge signature={cmd.signature} showVerifiedIcon={false} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
