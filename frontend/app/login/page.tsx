"use client";

import { useState } from "react";
import api from "../../lib/api";
import { setAuthToken } from "../../lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/request-otp", { email });
      setStep("otp");
    } catch {
      setError("Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/verify-otp", { email, otp });
      setAuthToken(res.data.token);
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 fade-up">
      <div className="relative w-full max-w-[420px] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-3xl font-semibold tracking-wide mb-1">
          PROCTOR<span className="text-[#4f8eff]">//</span>AI
        </h1>
        <p className="text-white/50 text-sm mb-6">Secure authentication required.</p>

        {step === "email" ? (
          <>
            <input
              type="email"
              placeholder="Email address"
              className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 mb-4 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#4f8eff] to-blue-400 text-white font-medium shadow-[0_0_20px_rgba(79,142,255,0.35)] hover:brightness-110 active:scale-[0.98] transition"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 mb-4 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#4f8eff] to-blue-400 text-white font-medium shadow-[0_0_20px_rgba(79,142,255,0.35)] hover:brightness-110 active:scale-[0.98] transition"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-2 text-sm">{error}</p>}
      </div>
      <p className="absolute bottom-6 text-xs text-white/35 font-mono">v1.0.0-security</p>
    </div>
  );
}
