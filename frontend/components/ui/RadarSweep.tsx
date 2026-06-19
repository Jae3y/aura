"use client";

/**
 * RadarSweep — rotating radar animation with real presence blips.
 * Used on Detection Map page to replace the static 2D grid.
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Blip {
  angle: number; // degrees
  distance: number; // 0-1 (fraction of radius)
  type: "alert" | "clear";
}

interface RadarSweepProps {
  blips?: Blip[];
  size?: number;
  color?: string;
  className?: string;
}

const DEFAULT_BLIPS: Blip[] = [
  { angle: 45, distance: 0.6, type: "alert" },
  { angle: 200, distance: 0.35, type: "clear" },
  { angle: 310, distance: 0.7, type: "clear" },
];

export function RadarSweep({
  blips = DEFAULT_BLIPS,
  color = "#06B6D4",
  className = "",
}: RadarSweepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const sweepAngle = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = canvas.offsetWidth;
    canvas.width = SIZE * window.devicePixelRatio;
    canvas.height = SIZE * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = SIZE / 2 - 10;

    const blipTrails = new Map<number, { x: number; y: number; alpha: number }[]>();

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Outer rings
      [1, 0.67, 0.33].forEach((fraction) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * fraction, 0, Math.PI * 2);
        ctx.strokeStyle = color + "22";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Cross-hairs
      ctx.strokeStyle = color + "18";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

      // Sweep gradient wedge
      sweepAngle.current = (sweepAngle.current + 1.5) % 360;
      const sweepRad = (sweepAngle.current * Math.PI) / 180;

      // Fallback arc sweep
      const wedgeSteps = 60;
      for (let i = 0; i < wedgeSteps; i++) {
        const frac = i / wedgeSteps;
        const angle = sweepRad - frac * (Math.PI / 2);
        const alpha = (1 - frac) * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, angle - 0.03, angle);
        ctx.closePath();
        ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
      ctx.strokeStyle = color + "CC";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Blips
      blips.forEach((blip, i) => {
        const blipRad = (blip.angle * Math.PI) / 180;
        const bx = cx + Math.cos(blipRad) * R * blip.distance;
        const by = cy + Math.sin(blipRad) * R * blip.distance;

        // Compute angular difference from sweep
        const angDiff = ((sweepAngle.current - blip.angle + 360) % 360);
        if (angDiff < 90) {
          const alpha = 1 - angDiff / 90;

          // Trails
          if (!blipTrails.has(i)) blipTrails.set(i, []);
          const trail = blipTrails.get(i)!;
          trail.push({ x: bx, y: by, alpha });
          if (trail.length > 10) trail.shift();

          trail.forEach((t, ti) => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fillStyle =
              (blip.type === "alert" ? "#EF4444" : color) +
              Math.floor((t.alpha * ti) / trail.length * 200).toString(16).padStart(2, "0");
            ctx.fill();
          });

          // Main blip
          ctx.beginPath();
          ctx.arc(bx, by, 4, 0, Math.PI * 2);
          ctx.fillStyle = blip.type === "alert" ? "#EF4444" : color;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(bx, by, 8, 0, Math.PI * 2);
          ctx.fillStyle = (blip.type === "alert" ? "#EF4444" : color) +
            Math.floor(alpha * 80).toString(16).padStart(2, "0");
          ctx.fill();
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [blips, color]);

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full rounded-full" />
      {/* Center dot */}
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_rgba(6,182,212,1)]" />
      </motion.div>
    </div>
  );
}
