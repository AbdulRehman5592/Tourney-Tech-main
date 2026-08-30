"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Button from "@/components/ui/Button";

const logo = "/img/logo.jpg"; // You can swap to logo1.png anytime

const NAV_LINKS = [
  { href: "#upcoming", label: "Tournaments" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
  { href: "mailto:support@tourneytech.app", label: "Contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="py-3 shadow-md relative z-40"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Tourney Tech Home">
            <Image
              src={logo}
              alt="Tourney Tech Logo"
              width={60}
              height={60}
              className="rounded-full"
            />
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="hover:text-[var(--accent-color)] transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] rounded"
                  style={{ color: "var(--foreground)" }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop auth buttons */}
          <ul className="hidden md:flex items-center gap-4">
            <li>
              <Button href="/auth/login" size="sm">Log In</Button>
            </li>
            <li>
              <Button href="/auth/signup" size="sm">Sign Up</Button>
            </li>
          </ul>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            style={{ color: "var(--foreground)" }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div
            className="md:hidden mt-3 pt-3 flex flex-col gap-3"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-2 py-2 rounded-lg text-sm font-medium hover:bg-[var(--secondary-color)]"
                style={{ color: "var(--foreground)" }}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 mt-1">
              <Button href="/auth/login" onClick={() => setMenuOpen(false)} className="flex-1">
                Log In
              </Button>
              <Button href="/auth/signup" onClick={() => setMenuOpen(false)} className="flex-1">
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
