"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface RelayToggleProps {
  active: boolean;
  onChange?: (active: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function RelayToggle({ active, onChange, disabled = false, size = "md" }: RelayToggleProps) {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!active)}
      className={clsx(
        "relative inline-flex items-center rounded-full transition-colors",
        isSm ? "h-5 w-9" : "h-7 w-12",
        active ? "bg-accent-cyan" : "bg-zinc-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <motion.div
        layout
        className={clsx(
          "bg-white rounded-full shadow-md",
          isSm ? "h-3 w-3" : "h-5 w-5"
        )}
        animate={{
          x: active ? (isSm ? 18 : 24) : 4,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />
    </button>
  );
}
