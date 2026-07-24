"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Link2,
  Brain,
  Play,
  ChevronRight,
  Cpu,
  Radio,
  Eye,
  Lock,
  Blocks,
  ShieldAlert,
  Activity,
  Server,
  Fingerprint,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ParticleField } from "@/components/ui/ParticleField";
import { HexGrid } from "@/components/ui/HexGrid";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  playRelayClick,
  playSurgeTripSound,
  toggleSound,
  isSoundEnabled,
} from "@/components/ui/TactileSound";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Feature Data ────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Activity,
    title: "10kHz High-Speed Sampling",
    desc: "ESP32 micro-sensors sample voltage, current, and frequency waveforms at 10,000 Hz to capture micro-arcs before thermal damage occurs.",
    spec: "< 0.04ms Isolation",
    code: "NODE // LATENCY_CRIT",
  },
  {
    icon: Link2,
    title: "Solana Devnet Verification",
    desc: "Every critical surge event is hashed and anchored on-chain with Ed25519 cryptographic signatures for independent insurance auditability.",
    spec: "Solana Devnet Proof",
    code: "BLOCKCHAIN // ANCHOR",
  },
  {
    icon: Brain,
    title: "Edge TinyML Inference",
    desc: "On-device neural network classifies surge waveforms locally. Zero reliance on cloud connectivity when grid emergency strikes.",
    spec: "Autonomous Edge AI",
    code: "MODEL // ARC_DETECT",
  },
  {
    icon: ShieldAlert,
    title: "Adaptive Environment Context",
    desc: "Specialized response profiles for Residential, Clinical/Hospital, and Heavy Industrial grids with custom escalation rules.",
    spec: "3 Environment Modes",
    code: "CONFIG // ENV_ADAPT",
  },
];

const COMPARISON_MATRIX = [
  {
    feature: "Detection Speed",
    mov: "Passive thermal reaction (>10ms)",
    aura: "0.04ms Active TinyML Arc Analysis",
    advantage: "250x Faster",
  },
  {
    feature: "Component Degradation",
    mov: "Silent wear down until total failure",
    aura: "Continuous Health Diagnostics & Telemetry",
    advantage: "Predictive",
  },
  {
    feature: "Auditability & Evidence",
    mov: "Zero logging or proof of failure",
    aura: "Ed25519 Hashed Solana Devnet Proofs",
    advantage: "Immutable",
  },
  {
    feature: "Grid Intelligence",
    mov: "Dumb metal oxide varistor",
    aura: "Multi-Zone MQTT Telemetry + Alerta Hub",
    advantage: "Autonomous",
  },
];

const TECH_STACK = [
  { icon: Cpu, label: "ESP32 S3", desc: "Dual-Core 240MHz MCU" },
  { icon: Link2, label: "Solana", desc: "Devnet Ledger Proofs" },
  { icon: Server, label: "Supabase", desc: "Realtime Telemetry DB" },
  { icon: Radio, label: "MQTT Broker", desc: "Sub-Second Message Bus" },
  { icon: Shield, label: "Alerta Hub", desc: "De-duplicated Alert Engine" },
  { icon: Brain, label: "TinyML", desc: "Edge Neural Classifier" },
  { icon: Lock, label: "Ed25519", desc: "Hardware Crypto Signing" },
  { icon: Blocks, label: "Lisk", desc: "Cross-Chain Relays" },
  { icon: Fingerprint, label: "Phantom", desc: "Wallet Auth Integration" },
];

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [ringsVisible, setRingsVisible] = useState(false);
  const [soundActive, setSoundActive] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  /* Surge Simulation Interactive Widget State */
  const [simState, setSimState] = useState<"IDLE" | "SURGE" | "TRIPPED">("IDLE");
  const [voltageVal, setVoltageVal] = useState(230.4);
  const [currentVal, setCurrentVal] = useState(12.8);
  const [txHash, setTxHash] = useState<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  /* Scroll listener for nav background */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Audio toggle handler */
  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundActive(next);
    if (next) playRelayClick();
  };

  /* Interactive Surge Simulator Trigger */
  const triggerSurgeSimulation = () => {
    if (simState !== "IDLE") return;
    playSurgeTripSound();
    setSimState("SURGE");
    setVoltageVal(488.6);
    setCurrentVal(42.5);

    setTimeout(() => {
      playRelayClick();
      setSimState("TRIPPED");
      setVoltageVal(0.0);
      setCurrentVal(0.0);
      setTxHash("5K7x9...mQ4Z");
    }, 900);
  };

  const resetSurgeSimulation = () => {
    playRelayClick();
    setSimState("IDLE");
    setVoltageVal(230.4);
    setCurrentVal(12.8);
    setTxHash(null);
  };

  /* ─── Hero GSAP timeline (the single signature moment) ─── */
  useGSAP(
    () => {
      if (reducedMotion) {
        setRingsVisible(true);
        gsap.set([".hero-status", ".hero-shield-wrap", ".hero-ring", ".hero-sub", ".hero-cta"], {
          opacity: 1,
        });
        gsap.set(".hero-char", { opacity: 1 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.2 });

      /* Phase 1: Terminal Status Bar boot in */
      tl.fromTo(
        ".hero-status",
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );

      /* Phase 2: Tactical Shield materializes with hardware glitch flicker */
      tl.fromTo(
        ".hero-shield-wrap",
        { opacity: 0, scale: 0.85, filter: "blur(6px)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.45,
          ease: "power3.out",
        }
      );
      tl.to(".hero-shield-wrap", { opacity: 0.2, duration: 0.04 });
      tl.to(".hero-shield-wrap", { opacity: 1, duration: 0.04 });
      tl.to(".hero-shield-wrap", { opacity: 0.5, duration: 0.03 });
      tl.to(".hero-shield-wrap", { opacity: 1, duration: 0.05 });

      /* Phase 3: Telemetry Rings expand and appear */
      tl.call(() => setRingsVisible(true));
      tl.fromTo(
        ".hero-ring",
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1,
          scale: 1,
          stagger: 0.08,
          duration: 0.55,
          ease: "power2.out",
        },
        "-=0.2"
      );

      /* Phase 4: Headline types in character by character */
      tl.fromTo(
        ".hero-char",
        { opacity: 0 },
        {
          opacity: 1,
          stagger: 0.035,
          duration: 0.01,
          ease: "none",
        },
        "-=0.25"
      );

      /* Phase 5: Blinking cursor fade out */
      tl.fromTo(
        ".hero-cursor",
        { opacity: 1 },
        {
          opacity: 0,
          duration: 0.01,
          delay: 0.5,
          ease: "none",
        }
      );

      /* Phase 6: Subtext + CTA fade up */
      tl.fromTo(
        ".hero-sub",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
        "-=0.2"
      );
      tl.fromTo(
        ".hero-cta",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        "-=0.3"
      );
    },
    { scope: heroRef, dependencies: [reducedMotion] }
  );

  /* ─── Features scroll reveal ─── */
  useGSAP(
    () => {
      if (reducedMotion || !featuresRef.current) return;

      const cards = gsap.utils.toArray<HTMLElement>(".feature-card");
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            delay: i * 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              once: true,
            },
          }
        );
      });
    },
    { scope: featuresRef, dependencies: [reducedMotion] }
  );

  const ctaHref = isAuthenticated ? "/dashboard" : "/connect";
  const ctaLabel = isAuthenticated ? "OPEN DASHBOARD" : "INITIALIZE SYSTEM";

  return (
    <div className="landing-noise relative min-h-dvh overflow-x-hidden bg-background text-foreground font-sans">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  NAV                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-black/90 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-accent-cyan/40 bg-accent-cyan/10">
              <Shield size={16} className="text-accent-cyan" />
            </span>
            <span className="font-heading text-sm font-black uppercase tracking-[0.22em] text-white">
              AURA <span className="text-[10px] font-mono text-accent-cyan/80">[v2.4]</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: "TELEMETRY", href: "#overview" },
              { label: "ARCHITECTURE", href: "#architecture" },
              { label: "COMPARISON", href: "#matrix" },
              { label: "DEMO VIDEO", href: "#demo" },
              { label: "STACK", href: "#stack" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={playRelayClick}
                className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:text-accent-cyan"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Tactile Sound Cue Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundActive ? "Mute Tactile Audio" : "Enable Tactile Audio"}
              className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.04] text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-accent-cyan"
            >
              {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} className="text-text-muted" />}
            </button>

            <Link
              href={ctaHref}
              onClick={playRelayClick}
              className="flex items-center gap-2 border border-accent-cyan/50 bg-accent-cyan/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-cyan transition-all hover:bg-accent-cyan hover:text-black active:scale-[0.98]"
            >
              <span className="led-indicator led-green" />
              {ctaLabel}
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  HERO — Signature Moment + Interactive Surge Simulator           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        id="overview"
        className="relative flex min-h-dvh items-center overflow-hidden pt-24 pb-16 md:py-0"
      >
        {/* Tactical Grid Background */}
        <div className="absolute inset-0 pointer-events-none">
          <HexGrid rows={14} cols={12} highlightIndices={[12, 28, 44, 60, 76, 92]} />
          <ParticleField count={35} color="#06B6D4" speed={0.15} connected />
          <div className="absolute inset-0 bg-gradient-radial from-accent-cyan/[0.05] via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-12">
            
            {/* Left Column — Tactical Telemetry & Copy */}
            <div className="flex flex-col items-start lg:col-span-7">
              {/* Monospaced System Status Bar */}
              <div className="hero-status mb-6 flex flex-wrap items-center gap-3 border border-white/10 bg-black/60 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                <span className="flex items-center gap-2">
                  <span className="led-indicator led-green" />
                  SYSTEM NODE: ACTIVE
                </span>
                <span className="text-white/20">|</span>
                <span className="text-accent-cyan">SAMPLING: 10,000Hz</span>
                <span className="text-white/20">|</span>
                <span className="text-text-muted">SOLANA: DEVNET</span>
              </div>

              {/* Macro-Typography Headline */}
              <h1
                className="font-heading text-[2.2rem] font-black uppercase leading-[1.02] tracking-[0.02em] sm:text-5xl md:text-6xl lg:text-[3.8rem]"
                aria-label="Real-time threat defense"
              >
                {"REAL-TIME".split("").map((ch, i) => (
                  <span key={`l1-${i}`} className="hero-char" style={{ opacity: reducedMotion ? 1 : 0 }}>
                    {ch}
                  </span>
                ))}
                <br />
                {"AUTONOMOUS".split("").map((ch, i) => (
                  <span key={`l2-${i}`} className="hero-char" style={{ opacity: reducedMotion ? 1 : 0 }}>
                    {ch}
                  </span>
                ))}{" "}
                <br className="hidden sm:inline" />
                <span className="text-gradient-cyan">
                  {"SURGE DEFENSE".split("").map((ch, i) => (
                    <span key={`l3-${i}`} className="hero-char" style={{ opacity: reducedMotion ? 1 : 0 }}>
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="hero-cursor ml-1 inline-block h-[0.85em] w-[4px] translate-y-[0.05em] bg-accent-cyan" />
              </h1>

              {/* Subtext */}
              <p
                className="hero-sub mt-6 max-w-xl text-[14.5px] leading-relaxed text-text-secondary"
                style={{ opacity: reducedMotion ? 1 : 0 }}
              >
                TinyML edge-intelligence meets sub-millisecond solid-state relay isolation. 
                AURA classifies electrical anomalies in <span className="font-mono text-white font-bold">0.04ms</span> and 
                anchors cryptographic proof directly to Solana.
              </p>

              {/* CTAs */}
              <div className="hero-cta mt-8 flex flex-wrap items-center gap-4" style={{ opacity: reducedMotion ? 1 : 0 }}>
                <Link
                  href={ctaHref}
                  onClick={playRelayClick}
                  className="group flex items-center gap-3 border-2 border-white bg-white px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-black transition-all hover:bg-accent-cyan hover:border-accent-cyan active:scale-[0.98]"
                >
                  {ctaLabel}
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#matrix"
                  onClick={playRelayClick}
                  className="flex items-center gap-2 border border-white/20 bg-white/[0.03] px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-all hover:border-accent-cyan/50 hover:text-white active:scale-[0.98]"
                >
                  WHY AURA VS MOV
                </a>
              </div>
            </div>

            {/* Right Column — Interactive Tactical Telemetry Widget (Signature Moment) */}
            <div className="flex justify-center lg:col-span-5 lg:justify-end">
              <div className="relative w-full max-w-[420px] border border-white/10 bg-card p-5 sm:p-6 shadow-2xl">
                {/* Header Strip */}
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Zap size={13} className="text-accent-cyan" />
                    [ LIVE_HARDWARE_SIM ]
                  </span>
                  <span className="flex items-center gap-1.5">
                    {simState === "IDLE" && <span className="led-indicator led-green" />}
                    {simState === "SURGE" && <span className="led-indicator led-amber animate-ping" />}
                    {simState === "TRIPPED" && <span className="led-indicator led-red" />}
                    <span className={simState === "TRIPPED" ? "text-accent-danger" : "text-text-muted"}>
                      {simState}
                    </span>
                  </span>
                </div>

                {/* Telemetry Display Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 font-mono">
                  <div className="border border-white/[0.08] bg-black/60 p-3">
                    <span className="block text-[9px] uppercase tracking-[0.14em] text-text-muted">
                      Grid Voltage
                    </span>
                    <span className={`text-xl font-bold num-tabular ${simState === "SURGE" ? "text-accent-danger text-glow-red animate-pulse" : "text-white"}`}>
                      {voltageVal.toFixed(1)}V
                    </span>
                  </div>

                  <div className="border border-white/[0.08] bg-black/60 p-3">
                    <span className="block text-[9px] uppercase tracking-[0.14em] text-text-muted">
                      Load Current
                    </span>
                    <span className={`text-xl font-bold num-tabular ${simState === "SURGE" ? "text-accent-warning" : "text-white"}`}>
                      {currentVal.toFixed(1)}A
                    </span>
                  </div>
                </div>

                {/* Status Diagnostic Bar */}
                <div className="mb-5 border border-white/[0.08] bg-black/40 p-3 font-mono text-[11px]">
                  {simState === "IDLE" && (
                    <p className="text-text-secondary flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-accent-teal" />
                      Status: Nominal (50.0 Hz)
                    </p>
                  )}
                  {simState === "SURGE" && (
                    <p className="text-accent-danger font-bold flex items-center gap-2 animate-pulse">
                      <ShieldAlert size={13} />
                      CRITICAL SURGE DETECTED!
                    </p>
                  )}
                  {simState === "TRIPPED" && (
                    <div className="space-y-1">
                      <p className="text-accent-cyan font-bold flex items-center gap-2">
                        <Lock size={13} />
                        RELAY CUTOFF COMPLETE (0.04ms)
                      </p>
                      <p className="text-[10px] text-text-muted flex items-center gap-1.5 truncate">
                        <Link2 size={11} className="text-accent-purple" />
                        Solana Tx: {txHash}
                      </p>
                    </div>
                  )}
                </div>

                {/* Simulation Control Buttons */}
                <div className="flex gap-2">
                  {simState === "IDLE" && (
                    <button
                      onClick={triggerSurgeSimulation}
                      className="w-full border border-accent-danger/60 bg-accent-danger/15 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent-danger transition-all hover:bg-accent-danger hover:text-black active:scale-[0.98]"
                    >
                      TRIGGER TEST SURGE (1000V/μs)
                    </button>
                  )}
                  {simState === "SURGE" && (
                    <button
                      disabled
                      className="w-full border border-accent-amber/40 bg-accent-amber/10 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent-amber animate-pulse"
                    >
                      TINYML CUTOFF IN PROGRESS...
                    </button>
                  )}
                  {simState === "TRIPPED" && (
                    <button
                      onClick={resetSurgeSimulation}
                      className="w-full border border-white/20 bg-white/10 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all hover:bg-white hover:text-black active:scale-[0.98]"
                    >
                      RESET CIRCUIT BREAKER
                    </button>
                  )}
                </div>

                {/* Hardware Spec Marker */}
                <div className="mt-4 border-t border-white/[0.06] pt-3 flex items-center justify-between font-mono text-[9px] text-text-muted uppercase tracking-[0.14em]">
                  <span>HARDWARE: REV_2.4_ESP32</span>
                  <span>ISOLATION: DUAL-SSR</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  FEATURES — Technical Blueprint Bento                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="architecture" className="relative py-20 sm:py-28 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          
          <div className="mb-12 flex flex-col items-start">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-cyan mb-2">
              [ 01 // ARCHITECTURE ]
            </span>
            <h2 className="font-heading text-2xl font-black uppercase tracking-[0.04em] sm:text-4xl">
              HARDWARE & INTELLIGENCE SPECS
            </h2>
          </div>

          <div
            ref={featuresRef}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="feature-card group relative border border-white/10 bg-card p-6 transition-all hover:border-accent-cyan/40 hover:bg-card-hover"
                  style={{ opacity: reducedMotion ? 1 : 0 }}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center border border-accent-cyan/30 bg-accent-cyan/10">
                      <Icon size={18} className="text-accent-cyan" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
                      {f.code}
                    </span>
                  </div>

                  <h3 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-white">
                    {f.title}
                  </h3>

                  <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
                    {f.desc}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 border border-white/10 bg-black/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent-cyan">
                    <span className="led-indicator led-green" />
                    {f.spec}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  COMPARISON MATRIX — Why AURA vs MOV                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="matrix" className="relative py-20 sm:py-28 border-t border-white/10 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          
          <div className="mb-12 flex flex-col items-start">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-cyan mb-2">
              [ 02 // HARDWARE MATRIX ]
            </span>
            <h2 className="font-heading text-2xl font-black uppercase tracking-[0.04em] sm:text-4xl">
              TRADITIONAL MOV STRIP VS. AURA CORE
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] text-text-secondary">
              Conventional Metal Oxide Varistor (MOV) surge protectors fail passively and burn out silently. 
              AURA active defense provides predictive hardware protection with zero blind spots.
            </p>
          </div>

          <div className="overflow-x-auto border border-white/10 bg-black">
            <table className="w-full text-left font-mono text-[12px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] uppercase tracking-[0.16em] text-text-muted">
                  <th className="p-4 sm:p-5">FUNCTIONAL FEATURE</th>
                  <th className="p-4 sm:p-5 text-accent-danger/80">PASSIVE MOV SURGE STRIP</th>
                  <th className="p-4 sm:p-5 text-accent-cyan">AURA AUTONOMOUS CORE</th>
                  <th className="p-4 sm:p-5 text-right">PERFORMANCE DELTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {COMPARISON_MATRIX.map((row) => (
                  <tr key={row.feature} className="transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 sm:p-5 font-bold text-white uppercase tracking-[0.1em]">
                      {row.feature}
                    </td>
                    <td className="p-4 sm:p-5 text-text-muted flex items-center gap-2">
                      <XCircle size={14} className="text-accent-danger/60 shrink-0" />
                      {row.mov}
                    </td>
                    <td className="p-4 sm:p-5 text-accent-cyan font-semibold flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-accent-teal shrink-0" />
                      {row.aura}
                    </td>
                    <td className="p-4 sm:p-5 text-right font-bold text-white uppercase tracking-[0.14em]">
                      <span className="inline-block border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-[10px] text-accent-cyan">
                        {row.advantage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  VIDEO SECTION — Demo HUD                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="demo" className="relative py-20 sm:py-28 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          
          <div className="mb-10 flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-cyan mb-2 block">
                [ 03 // VISUAL DEMONSTRATION ]
              </span>
              <h2 className="font-heading text-2xl font-black uppercase tracking-[0.04em] sm:text-4xl">
                100,000V SURGE TEST WALKTHROUGH
              </h2>
            </div>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted sm:inline-block">
              DURATION: 03:42
            </span>
          </div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="group relative overflow-hidden border border-white/10 bg-black"
          >
            <div className="relative aspect-video w-full cursor-pointer bg-card" onClick={() => setVideoModalOpen(true)}>
              <div className="scanlines absolute inset-0" />
              
              {/* Industrial Grid Lines */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />

              {/* Corner Framing Markers */}
              <div className="absolute top-4 left-4 font-mono text-[10px] text-accent-cyan uppercase tracking-[0.16em]">
                [ CAM_01 // HIGH_SPEED_LAB ]
              </div>
              <div className="absolute top-4 right-4 font-mono text-[10px] text-text-muted uppercase tracking-[0.16em]">
                REC ● 60FPS
              </div>

              {/* Play Trigger */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-20 w-20 items-center justify-center border-2 border-white bg-black/80 text-white transition-all group-hover:border-accent-cyan group-hover:text-accent-cyan"
                >
                  <Play size={28} className="ml-1" />
                </motion.div>
                <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary group-hover:text-white">
                  WATCH HARDWARE CUTOFF DEMO
                </p>
              </div>
            </div>

            {/* Bottom HUD bar */}
            <div className="flex items-center justify-between border-t border-white/10 bg-card px-5 py-3 font-mono text-[10.5px]">
              <div className="flex items-center gap-3">
                <span className="led-indicator led-green" />
                <span className="font-bold uppercase tracking-[0.14em] text-white">
                  AURA Autonomous Relay Cutoff vs 100kV Impulse
                </span>
              </div>
              <span className="uppercase tracking-[0.14em] text-accent-cyan">
                FULL DEMO [HD]
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl border border-white/20 bg-card p-2">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute -top-10 right-0 flex items-center gap-1 font-mono text-xs font-bold uppercase text-white hover:text-accent-cyan"
            >
              <X size={16} /> CLOSE [ESC]
            </button>
            <div className="aspect-video w-full bg-black flex flex-col items-center justify-center border border-white/10">
              <ShieldAlert size={48} className="text-accent-cyan mb-3 animate-pulse" />
              <p className="font-mono text-sm font-bold uppercase text-white tracking-[0.16em]">
                DEMO VIDEO PLACEHOLDER
              </p>
              <p className="font-mono text-xs text-text-muted mt-1">
                (Real video file will be dropped into this container)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  TECH STACK — Technical Component Grid                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="stack" className="relative py-20 sm:py-28 border-t border-white/10 bg-card/30">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          
          <div className="mb-12 flex flex-col items-start">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-cyan mb-2">
              [ 04 // PROTOCOL STACK ]
            </span>
            <h2 className="font-heading text-2xl font-black uppercase tracking-[0.04em] sm:text-4xl">
              DECLASSIFIED INFRASTRUCTURE
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TECH_STACK.map((tech) => {
              const Icon = tech.icon;
              return (
                <div
                  key={tech.label}
                  className="flex items-center gap-4 border border-white/10 bg-black p-4 transition-colors hover:border-accent-cyan/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent-cyan/30 bg-accent-cyan/10">
                    <Icon size={18} className="text-accent-cyan" />
                  </span>
                  <div>
                    <h4 className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-white">
                      {tech.label}
                    </h4>
                    <p className="font-mono text-[10px] text-text-muted">
                      {tech.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  CTA — Final Deployment Launchpad                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="relative border border-white/10 bg-black p-8 sm:p-14">
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center border border-accent-cyan/40 bg-accent-cyan/10">
                <Shield size={26} className="text-accent-cyan" />
              </span>

              <h2 className="font-heading text-2xl font-black uppercase tracking-[0.06em] sm:text-4xl md:text-5xl">
                READY TO DEPLOY AURA NODE
              </h2>

              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-text-secondary">
                Connect your Phantom wallet or authenticate via Supabase. 
                Experience real-time power protection built for critical systems.
              </p>

              <Link
                href={ctaHref}
                onClick={playRelayClick}
                className="mt-8 flex items-center gap-3 border-2 border-white bg-white px-8 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-black transition-all hover:bg-accent-cyan hover:border-accent-cyan active:scale-[0.98]"
              >
                {ctaLabel}
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Hardware Telemetry Strip */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-[0.14em]">
              {[
                { label: "GRID VOLTAGE", value: "230.4V", status: "green" },
                { label: "FREQUENCY", value: "50.0Hz", status: "green" },
                { label: "SAMPLING", value: "10,000Hz", status: "green" },
                { label: "SOLANA DEVNET", value: "CONNECTED", status: "cyan" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`led-indicator led-${item.status}`} />
                  <span className="text-text-muted">{item.label}:</span>
                  <span className="font-bold text-white num-tabular">{item.value}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  FOOTER                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 py-8 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between sm:px-8">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            <Shield size={14} className="text-accent-cyan" />
            <span>AURA — Autonomous Utility & Response Assistant</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://devpost.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Devpost
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
