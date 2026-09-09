"use client"

// components/Hero.js
import Image from "next/image";
import Button from "@/components/ui/Button";

const heroImg = "/img/hero-right-img.png";

export default function Hero() {
  return (
    <section
      className="py-14 md:py-16"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 justify-between">
        {/* Left Content */}
        <div className="w-full lg:w-3/5 text-center lg:text-left">
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
        </div>

        {/* Right Image or Illustration */}
        <div className="w-full lg:w-2/5 hidden lg:block">
          <Image
            src={heroImg}
            alt="Tournament Bracket"
            width={400}
            height={300}
            className="mx-auto rounded-xl shadow-lg w-full h-auto max-w-sm"
            priority
          />
        </div>
      </div>
    </section>
  );
}
