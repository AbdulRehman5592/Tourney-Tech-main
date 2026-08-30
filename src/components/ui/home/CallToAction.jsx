"use client"

import Link from "next/link";

export default function CallToAction() {
  return (
    <section
      className="py-16"
      style={{
        background: 'linear-gradient(to right, var(--accent-color), var(--accent-hover))',
        color: 'var(--secondary-color)',
      }}
    >
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Join the Battle? 🎮
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Compete with other players, track your progress, and climb the leaderboard in exciting tournaments!
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-3 rounded-xl font-semibold transition bg-[var(--secondary-color)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color)] focus:ring-offset-2"
        >
          Join Tournament
        </Link>
      </div>
    </section>
  );
}
