"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const resendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email before resending OTP.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/resend-otp", { email });
      toast.success(res.data.message || "OTP resent successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !otp) {
      toast.error("Please enter both email and OTP.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/verify-otp", { email, otp });

      if (res?.data?.success) {
        toast.success(res.data.message || "Email verified successfully!");
        router.push("/auth/login");
      } else {
        toast.error(res?.data?.message || "Verification failed");
      }
    } catch (error) {
      const errMsg =
        error?.response?.data?.message || "Invalid OTP or server error";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader />}
      <main
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div
          className="w-full max-w-md p-8 rounded-xl shadow-lg"
          style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h1
            className="text-3xl font-bold text-center mb-6"
            style={{ color: "var(--accent-color)" }}
          >
            Verify Your Email
          </h1>

          <p
            className="text-center mb-6 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Enter the 6-digit OTP sent to your email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-md border outline-none focus:ring-2"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* OTP */}
            <div>
              <label className="block mb-2 text-sm font-medium">OTP Code</label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full px-4 py-2 rounded-md border tracking-widest text-center text-lg font-semibold outline-none"
                style={{
                  backgroundColor: "var(--secondary-color)",
                  borderColor: "var(--border-color)",
                  color: "var(--foreground)",
                  letterSpacing: "0.3rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md font-semibold transition hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--accent-color)",
                color: "var(--background)",
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Didn’t receive the code?{" "}
            <span
              className={`cursor-pointer hover:underline ${
                !email ? "opacity-50 pointer-events-none" : ""
              }`}
              style={{ color: "var(--accent-color)" }}
              onClick={resendOtp}
            >
              Resend
            </span>
          </p>
        </div>
      </main>
    </>
  );
}
