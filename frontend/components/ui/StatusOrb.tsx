import { clsx } from "clsx";
import { motion } from "framer-motion";

export type SystemStatus = "secure" | "warning" | "threat" | "offline" | "info";

interface StatusOrbProps {
  status: SystemStatus;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function StatusOrb({ status, size = "md", animate = true }: StatusOrbProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-6 h-6",
    lg: "w-12 h-12",
  };

  const statusConfig = {
    secure: { bg: "bg-accent-cyan", glow: "rgba(6,182,212,0.8)" },
    warning: { bg: "bg-accent-warning", glow: "rgba(245,158,11,0.8)" },
    threat: { bg: "bg-accent-danger", glow: "rgba(239,68,68,0.8)" },
    info: { bg: "bg-accent-teal", glow: "rgba(20,184,166,0.8)" },
    offline: { bg: "bg-zinc-600", glow: "rgba(82,82,91,0.5)" },
  };

  const config = statusConfig[status];

  // Using inline styles for dynamic box-shadow animations
  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        className={clsx("rounded-full", sizeClasses[size], config.bg)}
        animate={
          animate && (status === "threat" || status === "warning")
            ? {
                boxShadow: [
                  `0 0 0px ${config.glow}`,
                  `0 0 20px ${config.glow}`,
                  `0 0 0px ${config.glow}`,
                ],
              }
            : {
                boxShadow: `0 0 10px ${config.glow}`,
              }
        }
        transition={
          animate && (status === "threat" || status === "warning")
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
      />
    </div>
  );
}
