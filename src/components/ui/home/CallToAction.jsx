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
          Ready for Your Next Tournament?
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Find an upcoming event, register your team, compete, and track your results — all with Tourney Tech.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="#upcoming"
            className="inline-block px-6 py-3 rounded-xl font-semibold transition bg-[var(--secondary-color)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color)] focus:ring-offset-2"
          >
            Find a Tournament
          </Link>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 rounded-xl font-semibold transition bg-transparent text-[var(--secondary-color)] border-2 border-[var(--secondary-color)] hover:bg-[var(--secondary-color)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color)] focus:ring-offset-2"
          >
            Create a Tournament
          </Link>
        </div>
      </div>
    </section>
  );
}
