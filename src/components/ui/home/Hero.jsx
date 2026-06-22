"use client"

// components/Hero.js
import Image from "next/image";

import Link from "next/link";

const heroImg = "/img/hero-right-img.png";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white py-20">
      {/* <section className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white py-20"> */}
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center justify-between">
        {/* Left Content */}
        <div className="w-full lg:w-2/3 text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Manage Tournaments Effortlessly 🏆
          </h1>
          <p className="text-lg mb-8 text-gray-300">
            Create, schedule, and track tournaments like a pro. Brackets, teams,
            live updates — all in one powerful dashboard.
          </p>

          <Link
            href="/auth/login"
            className="font-semibold py-3 px-6 rounded-lg transition duration-300 inline-block"
            style={{
              backgroundColor: "var(--accent-color)",
              color: "var(--secondary-color)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--accent-hover)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--accent-color)")
            }
          >
            Lets Play Tournament
          </Link>
        </div>

        {/* Right Image or Illustration */}
        <div className="w-full lg:w-1/2 mb-10 lg:mb-0 hidden lg:block">
          <Image
            src={heroImg}
            alt="Tournament Bracket"
            width={400}
            height={300}
            className="mx-auto rounded-xl shadow-lg"
            priority
          />
        </div>
      </div>
    </section>
  );
}
