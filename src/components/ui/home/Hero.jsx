"use client"

// components/Hero.js
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import Button from "@/components/ui/Button";

const heroImg = "/img/hero-right-img.png";
const EASE = [0.22, 1, 0.36, 1];

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="py-14 md:py-16 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Soft drifting glow behind the hero content -- purely decorative,
          skipped entirely when the user prefers reduced motion. */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent-color) 22%, transparent), transparent 70%)",
          }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 justify-between relative z-10">
        {/* Left Content */}
        <motion.div
          className="w-full lg:w-3/5 text-center lg:text-left"
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Tournament Management. Simplified. <span aria-hidden="true">🏆</span>
          </h1>
          <p
            className="text-base mb-6"
            style={{ color: "var(--muted-foreground)" }}
          >
            From registration to final standings, Tourney Techs brings tournament
            directors, players, teams, scoring, and results together in one place.
          </p>

          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <Button href="#upcoming" size="lg">Find a Tournament</Button>
            <Button href="/auth/login" size="lg" variant="secondary">Host a Tournament</Button>
          </div>
        </motion.div>

        {/* Right Image or Illustration */}
        <motion.div
          className="w-full lg:w-2/5 hidden lg:block"
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24, scale: 0.96 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          <Image
            src={heroImg}
            alt="Tournament Bracket"
            width={400}
            height={300}
            className="mx-auto rounded-xl shadow-lg w-full h-auto max-w-sm"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}
