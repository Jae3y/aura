"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, CheckCircle2, Clock, Zap, AlertCircle, ChevronDown, XCircle, Loader2 } from "lucide-react";
import { SolanaExplorerBadge } from "@/components/ui/SolanaExplorerBadge";
import { GlitchText } from "@/components/ui/GlitchText";
import { pageTransitionVariants, staggerParentVariants, staggerChildVariants, toastVariants } from "@/lib/animations";
import { clsx } from "clsx";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { apiClient } from "@/lib/api/client";
import { useRealtimeStore } from "@/lib/stores/realtimeStore";
import type { VoiceCommand, Database } from "@/lib/types/database";

gsap.registerPlugin(useGSAP);

type Device = Database['public']['Tables']['devices']['Row'];

const BAR_COUNT = 32;

// ---------------------------------------------------------------------------
// Intent resolution – map spoken phrases to backend action names
// ---------------------------------------------------------------------------
function resolveIntent(transcript: string): {
  action_triggered?: string;
  parsed_intent?: string;
  relay_channel?: number;
} {
  const lower = transcript.toLowerCase();

  if (/\b(relay|light|switch)\b/.test(lower)) {
    if (/\b(on|enabl|activ(ate)?)\b/.test(lower)) {
      return {
        action_triggered: "relay_on",
        parsed_intent: "relay_on",
        relay_channel: extractChannel(lower) ?? 1,
      };
    }
    if (/\b(off|disabl|deactiv(ate)?)\b/.test(lower)) {
      return {
        action_triggered: "relay_off",
        parsed_intent: "relay_off",
        relay_channel: extractChannel(lower) ?? 1,
      };
    }
  }

  if (/\b(reboot|restart)\b/.test(lower)) {
    return { action_triggered: "reboot", parsed_intent: "reboot" };
  }

  if (/\b(status|report|health)\b/.test(lower)) {
    return { action_triggered: "status", parsed_intent: "status" };
  }

  return {};
}

function extractChannel(text: string): number | undefined {
  const match = text.match(/(?:channel|ch)\s*(\d)/i);
  return match ? parseInt(match[1]) : undefined;
}

// ---------------------------------------------------------------------------
// Web Speech API types helper
// ---------------------------------------------------------------------------
function createSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition ??
    (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function VoicePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [commandsLoading, setCommandsLoading] = useState(false);

  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const storeCommands = useRealtimeStore((s) => s.voiceCommands);
  const [fetchedCommands, setFetchedCommands] = useState<VoiceCommand[]>([]);

  const barsRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  // ---------- Device loading ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDevicesLoading(true);
        const res = await apiClient.get<{ devices: Device[] }>("/devices");
        if (cancelled) return;
        const list = res.devices ?? [];
        setDevices(list);
        if (list.length > 0) setSelectedDeviceId(list[0].id);
      } catch {
        if (!cancelled) setDevices([]);
      } finally {
        if (!cancelled) setDevicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Voice command history ----------
  const loadCommands = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    try {
      setCommandsLoading(true);
      const res = await apiClient.get<{ commands: VoiceCommand[] }>(
        `/devices/${deviceId}/voice`
      );
      setFetchedCommands(res.commands ?? []);
    } catch {
      setFetchedCommands([]);
    } finally {
      setCommandsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeviceId) loadCommands(selectedDeviceId);
  }, [selectedDeviceId, loadCommands]);

  // Merge fetched + live commands, dedup by id, newest first
  const recentCommands = mergeCommands(fetchedCommands, storeCommands);

  // ---------- GSAP waveform animation ----------
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

  // ---------- Submit voice command to backend ----------
  const submitCommand = useCallback(
    async (transcript: string, confidence: number) => {
      if (!selectedDeviceId) return;
      const intent = resolveIntent(transcript);
      try {
        await apiClient.post("/voice/command", {
          device_id: selectedDeviceId,
          raw_command: transcript,
          confidence_score: confidence,
          parsed_intent: intent.parsed_intent,
          action_triggered: intent.action_triggered,
          relay_channel: intent.relay_channel,
        });
      } catch {
        // The backend logged it; command may not be executed
      }
    },
    [selectedDeviceId]
  );

  // ---------- Speech recognition handlers ----------
  const submitCommandRef = useRef(submitCommand);
  submitCommandRef.current = submitCommand;

  const startListening = useCallback(() => {
    setMicError(null);
    setInterimText("");
    listeningRef.current = true;

    const recognition = createSpeechRecognition();
    if (!recognition) {
      setMicError("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setMicError("Microphone access denied. Please allow microphone permissions in your browser settings.");
        listeningRef.current = false;
      } else if (event.error === "no-speech") {
        // expected when silent – will restart in onend
      } else if (event.error === "aborted") {
        // user stopped
      } else {
        setMicError(`Microphone error: ${event.error}`);
        listeningRef.current = false;
      }
    };

    recognition.onend = () => {
      setListening(false);
      // Auto-restart if still supposed to be listening
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          listeningRef.current = false;
        }
      }
    };

    recognition.onresult = (event: any) => {
      const results: SpeechRecognitionResult[] = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          const confidence = result[0].confidence;
          if (transcript) {
            submitCommandRef.current(transcript, confidence);
            setLastCommand(transcript);
            setTimeout(() => setLastCommand(null), 3000);
          }
        } else {
          setInterimText(result[0].transcript);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setMicError("Failed to start microphone. Please check permissions.");
      listeningRef.current = false;
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText("");
  }, []);

  const handleMicClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  // ---------- Render ----------
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex flex-col w-full h-full px-4 pt-4 pb-8 items-center"
    >
      {/* Device selector */}
      <div className="w-full max-w-xs mb-6">
        {devicesLoading ? (
          <div className="flex items-center justify-center h-10">
            <Loader2 size={16} className="animate-spin text-text-muted" />
          </div>
        ) : devices.length === 0 ? (
          <p className="text-[10px] text-accent-danger font-bold text-center uppercase tracking-widest">
            No devices found. Pair a device first.
          </p>
        ) : (
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className={clsx(
                "w-full appearance-none rounded-lg border bg-card px-3 py-2 pr-8 text-xs font-semibold",
                "border-zinc-700 text-text-secondary focus:border-accent-cyan focus:outline-none focus:text-white"
              )}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.location_label ? `(${d.location_label})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="w-full flex justify-center mb-6 h-8">
        <AnimatePresence mode="wait">
          {micError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center space-x-2"
            >
              <AlertCircle size={12} className="text-accent-danger shrink-0" />
              <span className="text-[10px] text-accent-danger font-bold text-center max-w-[260px] leading-tight">
                {micError}
              </span>
            </motion.div>
          ) : listening ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
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
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs text-text-muted font-bold tracking-widest uppercase"
            >
              {selectedDeviceId ? "Tap to Activate" : "Select a device"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interim transcript */}
      <AnimatePresence>
        {interimText && listening && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-text-muted italic mb-2 h-4"
          >
            &ldquo;{interimText}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>

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
        whileHover={selectedDeviceId ? { scale: 1.06 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        disabled={!selectedDeviceId || devicesLoading}
        aria-label={listening ? "Stop listening" : "Start listening"}
        className={clsx(
          "relative w-22 h-22 rounded-full border-2 flex items-center justify-center transition-all duration-300 mb-8",
          listening
            ? "bg-accent-danger/10 border-accent-danger text-accent-danger"
            : selectedDeviceId
              ? "bg-zinc-900 border-zinc-700 text-text-secondary hover:border-accent-cyan hover:text-accent-cyan"
              : "bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed"
        )}
        style={{ width: 88, height: 88 }}
      >
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

        {commandsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-text-muted" />
          </div>
        ) : recentCommands.length === 0 ? (
          <p className="text-center text-[11px] text-text-muted py-8">
            No voice commands yet. Tap the mic and say something.
          </p>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerParentVariants}
            initial="initial"
            animate="animate"
          >
            {recentCommands.slice(0, 10).map((cmd) => (
              <motion.div
                key={cmd.id}
                variants={staggerChildVariants}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="bg-card border border-zinc-800 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {cmd.was_executed ? (
                      <CheckCircle2 size={14} className="text-accent-teal shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-accent-danger shrink-0" />
                    )}
                    <span className="text-sm font-bold text-white">&ldquo;{cmd.raw_command}&rdquo;</span>
                  </div>
                  {cmd.confidence_score != null && (
                    <div className="text-[9px] font-mono text-accent-cyan font-bold bg-accent-cyan/10 px-1.5 py-0.5 rounded">
                      {Math.round(cmd.confidence_score * 100)}%
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center text-[10px] text-text-muted font-mono">
                    <Clock size={10} className="mr-1" />
                    {timeAgo(cmd.issued_at)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {cmd.action_triggered && (
                      <span className="text-[9px] font-mono text-accent-teal uppercase">
                        {cmd.action_triggered}
                      </span>
                    )}
                    {cmd.solana_signature ? (
                      <SolanaExplorerBadge signature={cmd.solana_signature} showVerifiedIcon={false} />
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mergeCommands(
  fetched: VoiceCommand[],
  live: VoiceCommand[]
): VoiceCommand[] {
  const seen = new Set<string>();
  const merged: VoiceCommand[] = [];
  for (const cmd of [...live, ...fetched]) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      merged.push(cmd);
    }
  }
  merged.sort(
    (a, b) =>
      new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
  );
  return merged;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
