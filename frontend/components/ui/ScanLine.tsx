"use client";

/**
 * ScanLine — animated horizontal scan sweep across a container.
 * Gives a radar/sonar "sweeping" feel to panels.
 */

import { motion } from "framer-motion";
import { scanLineVariants } from "@/lib/animations";

interface ScanLineProps {
  color?: string;
  className?: string;
}

export function ScanLine({ color = "#06B6D4", className = "" }: ScanLineProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <motion.div
        variants={scanLineVariants}
        animate="animate"
        className="absolute left-0 right-0 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color}80 20%, ${color} 50%, ${color}80 80%, transparent 100%)`,
          boxShadow: `0 0 8px 1px ${color}60`,
        }}
      />
    </div>
  );
}
