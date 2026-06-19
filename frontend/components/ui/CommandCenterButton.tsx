"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { ReactNode } from "react";

interface CommandCenterButtonProps {
  label: string;
  icon?: ReactNode;
  variant?: "cyan" | "dark" | "red";
  onClick?: () => void;
  className?: string;
}

export function CommandCenterButton({
  label,
  icon,
  variant = "cyan",
  onClick,
  className,
}: CommandCenterButtonProps) {
  const variantStyles = {
    cyan: "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]",
    dark: "bg-zinc-900 border-zinc-800 text-text-primary hover:bg-zinc-800",
    red: "bg-accent-danger/10 border-accent-danger/50 text-accent-danger hover:bg-accent-danger/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center p-4 border rounded-lg transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <span className="text-xs font-bold tracking-widest uppercase text-center leading-tight">
        {label}
      </span>
    </motion.button>
  );
}
