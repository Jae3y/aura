"use client";

/**
 * HexGrid — animated hexagonal grid background for the home dashboard.
 * Pure CSS/SVG approach for performance.
 */

import { motion } from "framer-motion";

interface HexGridProps {
  rows?: number;
  cols?: number;
  className?: string;
  highlightIndices?: number[];
}

export function HexGrid({
  rows = 6,
  cols = 8,
  className = "",
  highlightIndices = [],
}: HexGridProps) {
  const hexes = [];
  const W = 40;
  const H = 46;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * W * 0.88 + (row % 2 === 1 ? W * 0.44 : 0);
      const y = row * H * 0.75;
      const idx = row * cols + col;
      const isHighlight = highlightIndices.includes(idx);

      hexes.push(
        <motion.polygon
          key={idx}
          points={`${W / 2},0 ${W},${H / 4} ${W},${(3 * H) / 4} ${W / 2},${H} 0,${(3 * H) / 4} 0,${H / 4}`}
          transform={`translate(${x}, ${y})`}
          fill={isHighlight ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.015)"}
          stroke={isHighlight ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.04)"}
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            ...(isHighlight && {
              fill: ["rgba(6,182,212,0.04)", "rgba(6,182,212,0.12)", "rgba(6,182,212,0.04)"],
              stroke: ["rgba(6,182,212,0.2)", "rgba(6,182,212,0.6)", "rgba(6,182,212,0.2)"],
            }),
          }}
          transition={{
            opacity: { delay: idx * 0.005, duration: 0.3 },
            ...(isHighlight && { fill: { duration: 2, repeat: Infinity, ease: "easeInOut" }, stroke: { duration: 2, repeat: Infinity } }),
          }}
        />
      );
    }
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0 opacity-80"
        style={{ overflow: "visible" }}
      >
        {hexes}
      </svg>
    </div>
  );
}
