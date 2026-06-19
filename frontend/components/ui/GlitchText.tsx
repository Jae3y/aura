"use client";

/**
 * GlitchText — CSS + JS glitch animation for critical alerts.
 * Uses layered pseudo-elements for chromatic aberration.
 */

import { motion } from "framer-motion";
import { glitchVariants } from "@/lib/animations";
import { clsx } from "clsx";

interface GlitchTextProps {
  text: string;
  className?: string;
  color?: "red" | "cyan" | "amber";
  size?: "sm" | "md" | "lg" | "xl";
}

const colorMap = {
  red: "text-accent-danger",
  cyan: "text-accent-cyan",
  amber: "text-accent-warning",
};

const sizeMap = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export function GlitchText({
  text,
  className,
  color = "red",
  size = "lg",
}: GlitchTextProps) {
  return (
    <div className={clsx("relative inline-block select-none", sizeMap[size], className)}>
      <motion.span
        variants={glitchVariants}
        animate="animate"
        className={clsx(
          "relative font-heading font-bold tracking-widest uppercase",
          colorMap[color]
        )}
        style={{ textShadow: `0 0 20px currentColor` }}
      >
        {text}
      </motion.span>
      {/* Chromatic aberration layers */}
      <span
        aria-hidden
        className={clsx(
          "absolute inset-0 font-heading font-bold tracking-widest uppercase opacity-60 pointer-events-none",
          color === "red" ? "text-blue-400" : "text-red-400"
        )}
        style={{
          transform: "translate(-2px, 0)",
          clipPath: "polygon(0 30%, 100% 30%, 100% 50%, 0 50%)",
          mixBlendMode: "screen",
        }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className={clsx(
          "absolute inset-0 font-heading font-bold tracking-widest uppercase opacity-40 pointer-events-none",
          color === "red" ? "text-green-400" : "text-amber-400"
        )}
        style={{
          transform: "translate(2px, 0)",
          clipPath: "polygon(0 55%, 100% 55%, 100% 75%, 0 75%)",
          mixBlendMode: "screen",
        }}
      >
        {text}
      </span>
    </div>
  );
}
