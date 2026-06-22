"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import Loader from "@/components/Loader";
import api from "@/utils/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // ✅ 1. Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");

    try {
      setLoading(true);
      const { data } = await api.post("/api/forgot-password", { email });
      toast.success(
        data?.message || "OTP sent successfully! Check your email."
      );
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 2. Verify OTP + Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otp || !newPassword || !confirmPassword)
      return toast.error("Please fill in all fields");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match");

    try {
      setLoading(true);
      const { data } = await api.post("/api/reset-password", {
        email,
        otp,
        newPassword,
      });

      toast.success(data?.message || "Password reset successful!");
      window.location.href = "/auth/login"; // ✅ redirect after success
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="w-full max-w-md bg-[var(--card-background)] p-8 rounded-2xl shadow-lg border border-[var(--border-color)]">
        <h1 className="text-2xl font-bold text-center mb-2 text-[var(--accent-color)]">
          Forgot Password
        </h1>
        <p className="text-center text-gray-400 mb-6">
          {!otpSent
            ? "Enter your registered email to receive an OTP."
            : "Enter the OTP you received and set a new password."}
        </p>

        {!otpSent ? (
          // 🟢 Step 1: Send OTP Form
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1 text-gray-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || otpSent}
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-lg transition-all shadow-md hover:scale-[1.02]"
            >
              {loading ? "Loading" : "Send OTP"}
            </button>
          </form>
        ) : (
          // 🟣 Step 2: Verify OTP & Reset Password Form
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium mb-1 text-gray-300"
              >
                OTP Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter the OTP sent to your email"
                className="w-full p-3 rounded-lg bg-[var(--secondary-color)] border border-[var(--border-color)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              />
            </div>

            <div>
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
              />
            </div>

            <div>
              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--success-color)] hover:bg-green-600 text-white font-semibold rounded-lg transition-all shadow-md hover:scale-[1.02] cursor-pointer"
            >
              {loading ? "Loading" : "Reset Password"}
            </button>

            {/* change email button */}
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                toast.success("You can now change your email.");
              }}
              className="w-full py-3 mt-1 bg-[var(--accent-color)]  text-black font-semibold rounded-lg transition-all hover:scale-[1.02] cursor-pointer"
            >
              Change Email
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <a
            href="/login"
            className="text-[var(--info-color)] hover:underline text-sm"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
