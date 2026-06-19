import { Variants } from "framer-motion";

// ── Page Transitions ─────────────────────────────────────────────────────────
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0, y: -12, filter: "blur(2px)",
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

// ── Alert Pulse (red threat glow) ─────────────────────────────────────────────
export const pulseAlertVariants: Variants = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(239,68,68,0)",
      "0 0 25px rgba(239,68,68,0.8), 0 0 50px rgba(239,68,68,0.3)",
      "0 0 0px rgba(239,68,68,0)",
    ],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
};

// ── Cyan Nominal Pulse ────────────────────────────────────────────────────────
export const pulseNominalVariants: Variants = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(6,182,212,0)",
      "0 0 20px rgba(6,182,212,0.6), 0 0 40px rgba(6,182,212,0.2)",
      "0 0 0px rgba(6,182,212,0)",
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
};

// ── Modal Entry ───────────────────────────────────────────────────────────────
export const modalEntryVariants: Variants = {
  initial: { opacity: 0, scale: 0.88, y: 30, filter: "blur(8px)" },
  animate: {
    opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring", stiffness: 320, damping: 28, mass: 0.9 },
  },
  exit: {
    opacity: 0, scale: 1.06, y: -10, filter: "blur(4px)",
    transition: { duration: 0.22, ease: "easeIn" },
  },
};

// ── Stagger Children ──────────────────────────────────────────────────────────
export const staggerParentVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const staggerChildVariants: Variants = {
  initial: { opacity: 0, y: 18, filter: "blur(4px)" },
  animate: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ── Card Hover Lift ───────────────────────────────────────────────────────────
export const cardHoverVariants = {
  rest: { y: 0, boxShadow: "0 0 0px rgba(6,182,212,0)" },
  hover: {
    y: -4,
    boxShadow: "0 8px 30px rgba(6,182,212,0.15)",
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

// ── Glitch Text (keyframes handled via CSS class, this is a JS trigger) ───────
export const glitchVariants: Variants = {
  animate: {
    x: [0, -2, 2, -1, 1, 0],
    skewX: [0, -1, 1, -0.5, 0],
    transition: { duration: 0.3, repeat: Infinity, repeatDelay: 2.5 },
  },
};

// ── Scan Line sweep ───────────────────────────────────────────────────────────
export const scanLineVariants: Variants = {
  animate: {
    y: ["-100%", "200%"],
    transition: { duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1.5 },
  },
};

// ── Floating Badge ────────────────────────────────────────────────────────────
export const floatVariants: Variants = {
  animate: {
    y: [-4, 4, -4],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
};

// ── Counter Spin (for number roll-ups) ───────────────────────────────────────
export const counterVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

// ── Button press spring ───────────────────────────────────────────────────────
export const buttonTapVariants = {
  whileTap: { scale: 0.95, transition: { type: "spring", stiffness: 600, damping: 20 } },
  whileHover: { scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

// ── Toast slide in ───────────────────────────────────────────────────────────
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 60, scale: 0.85 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 22 },
  },
  exit: {
    opacity: 0, y: 30, scale: 0.9,
    transition: { duration: 0.2 },
  },
};
