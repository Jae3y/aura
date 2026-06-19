"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, AlertCircle, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

export type ToastType = "info" | "success" | "error";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onDismiss: (id: string) => void;
  duration?: number;
}

export function ToastNotification({
  id,
  message,
  type = "info",
  onDismiss,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const typeConfig = {
    info: { icon: Info, bg: "bg-accent-teal/10", border: "border-accent-teal/30", text: "text-accent-teal" },
    success: { icon: CheckCircle, bg: "bg-accent-cyan/10", border: "border-accent-cyan/30", text: "text-accent-cyan" },
    error: { icon: AlertCircle, bg: "bg-accent-danger/10", border: "border-accent-danger/30", text: "text-accent-danger" },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "flex items-center p-3 mb-2 rounded shadow-lg border backdrop-blur-md w-full max-w-sm mx-auto",
        config.bg,
        config.border
      )}
    >
      <Icon size={18} className={clsx("mr-3 shrink-0", config.text)} />
      <span className="text-sm font-sans text-white">{message}</span>
    </motion.div>
  );
}

// Simple Toast Container for the UI phase
export function ToastContainer({ toasts, onDismiss }: { toasts: Omit<ToastProps, "onDismiss">[], onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-20 left-0 w-full px-4 z-[100] pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <ToastNotification {...toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
