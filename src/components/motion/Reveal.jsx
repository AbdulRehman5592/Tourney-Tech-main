"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Scroll-triggered fade/slide-in wrapper. Purely presentational -- wrap any
 * existing markup in this without changing its structure or logic. Animates
 * once, the first time it scrolls into view, and does nothing when the user
 * has "reduce motion" turned on.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  once = true,
  amount = 0.2,
  className,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
