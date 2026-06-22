"use client";

import Image from "next/image";
import Link from "next/link";

const logo = "/img/logo.jpg"; // You can swap to logo1.png anytime

export default function Header() {
  return (
    <header
      className="py-3 shadow-md"
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

          {/* Auth Buttons */}
          <ul className="flex items-center gap-4">
            <li>
              <Link href="/auth/login">
                <span
                  className="px-5 py-2 rounded-xl font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: "var(--accent-color)",
                    color: "var(--secondary-color)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--accent-hover)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--accent-color)")
                  }
                >
                  Log In
                </span>
              </Link>
            </li>
            <li>
              <Link href="/auth/signup">
                <span
                  className="px-5 py-2 rounded-xl font-medium transition cursor-pointer"
                  style={{
                    backgroundColor: "var(--accent-color)",
                    color: "var(--secondary-color)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--accent-hover)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "var(--accent-color)")
                  }
                >
                  Sign Up
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
