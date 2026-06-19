"use client";

/**
 * AnimatedCounter — smooth number roll-up using GSAP.
 * Animates from 0 (or a previous value) to the target number.
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className = "",
  duration = 1.2,
}: AnimatedCounterProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const counterObj = useRef({ val: 0 });

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      gsap.to(counterObj.current, {
        val: value,
        duration,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent =
            prefix +
            counterObj.current.val.toFixed(decimals) +
            suffix;
        },
      });
    },
    { scope: containerRef, dependencies: [value] }
  );

  return (
    <span ref={containerRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
