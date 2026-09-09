"use client";

import api from "@/utils/axios";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Loader from "@/components/Loader";

import PasswordInput from "@/components/ui/signup/PasswordInput";
import Button from "@/components/ui/Button";

import { toast } from "react-hot-toast";

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/api/login", {
        email,
        password,
      });

      const { user } = res.data.data;

      // Tokens are automatically set as HTTP-only cookies by the server
      // No need to store them in localStorage

      // store user in localStorage if needed
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Login successful!");

      // ✅ Wait a moment for cookies to be set before redirecting
      setTimeout(async () => {
        // ✅ Honor a same-site ?redirect= (e.g. back to an invite link) if
        // present -- only allow a relative path, never an absolute/external
        // URL, to avoid this becoming an open redirect.
        const isSafeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//");

        if (isSafeRedirect) {
          window.location.href = redirect;
        } else if (user.role === "admin") {
          window.location.href = "/admin";
        } else {
          // A player currently listed in a live tournament should land
          // straight on their score-entry screen instead of the generic
          // dashboard -- saves time when they're mid-event and just need to
          // get back to entering a score.
          try {
            const myTournamentsRes = await api.get("/api/tournaments/my-tournaments");
            const myTournaments = myTournamentsRes.data?.data || [];
            const activeTournament = myTournaments.find((t) => t.status === "ongoing");

            if (activeTournament) {
              window.location.href = `/dashboard/game-play/${activeTournament._id}`;
              return;
            }
          } catch (err) {
            console.error("Failed to check for an active tournament:", err);
          }

          window.location.href = "/dashboard";
        }
      }, 500); // Wait 500ms
    } catch (error) {
      console.error("Login error:", error);

      // Handle different types of errors
      let errorMessage = "Login failed. Please try again.";

      if (error?.response) {
        // Server responded with error
        const serverError = error?.response?.data?.message;
        const statusCode = error?.response?.status;

        if (statusCode === 401) {
          errorMessage = serverError || "Invalid email or password.";
        } else if (statusCode === 404) {
          errorMessage = serverError || "User not found. Please check your credentials.";
        } else if (statusCode === 400) {
          errorMessage = serverError || "Invalid request. Please check your input.";
        } else {
          errorMessage = serverError || errorMessage;
        }
      } else if (error?.request) {
        // Request made but no response
        errorMessage = "Network error. Please check your connection.";
      } else {
        // Something else happened
        errorMessage = error?.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false); // ✅ ensures it hides in both success & error
    }
  };

  return (
    <>
      <main
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div
          className="w-full max-w-md p-8 rounded-xl shadow-md"
          style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h1
            className="text-3xl font-bold mb-6 text-center"
            style={{ color: "var(--accent-color)" }}
          >
            Login to Tourney Techs
          </h1>

          {/* Error Message Display */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "color-mix(in srgb, var(--error-color) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--error-color) 45%, transparent)",
                color: "var(--error-color)",
              }}
            >
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(""); // Clear error when user starts typing
                }}
                className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  color: "var(--foreground)",
                  borderColor: error ? "var(--error-color)" : "var(--border-color)",
                  caretColor: "var(--accent-color)",
                }}
              />
            </div>

            <div>
              {/* <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium"
              >
                Password
              </label> */}
              {/* <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  color: "var(--foreground)",
                  borderColor: "var(--border-color)",
                  caretColor: "var(--accent-color)",
                }}
              /> */}
              <PasswordInput
                label="Password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (error) setError(""); // Clear error when user starts typing
                }}
              />

              <div className="mt-1 ">
                <Link href="/auth/forgot-password">
                  <span
                    className="text-sm hover:underline"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Forgot password?
                  </span>
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#9CA3AF" }}>
            Don’t have an account?{" "}
            <Link
              href={
                redirect
                  ? `/auth/signup?redirect=${encodeURIComponent(redirect)}`
                  : "/auth/signup"
              }
            >
              <span
                className="hover:underline"
                style={{ color: "var(--accent-color)" }}
              >
                Sign Up
              </span>
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
