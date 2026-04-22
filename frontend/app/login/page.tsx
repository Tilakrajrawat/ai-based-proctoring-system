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
      const res = await api.post("/api/auth/verify-otp", {
        email,
        otp,
      });
      setAuthToken(res.data.token);
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Info Panel */}
        <section className="glass-card accent-border relative overflow-hidden p-8 md:p-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              AI Proctoring System
            </div>

            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white md:text-5xl">
              Secure online exams with live AI-powered monitoring
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
              Authenticate, enter your exam environment, and let the platform
              continuously monitor integrity through real-time proctoring,
              behavior signals, and incident detection.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FeatureCard title="Live Monitoring" value="24/7" />
              <FeatureCard title="Risk Analysis" value="AI" />
              <FeatureCard title="Session Security" value="OTP" />
            </div>

            <div className="mt-8 grid gap-3 text-sm text-white/70">
              <p>• Face verification and live session protection</p>
              <p>• Suspicious behavior tracking and alerts</p>
              <p>• Real-time analytics for admins and proctors</p>
            </div>
          </div>
        </section>

        {/* Right Login Panel */}
        <section className="glass-card accent-border p-8 md:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300/90">
                Sign in
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Access your exam portal
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Use your registered email to receive a one-time verification code.
              </p>
            </div>

            <div className="mb-6 flex gap-2">
              <StepChip active={step === "email"} label="1. Email" />
              <StepChip active={step === "otp"} label="2. OTP" />
            </div>

            {step === "email" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">
                    Registered email
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="ai-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <button
                  onClick={sendOtp}
                  disabled={loading || !email}
                  className="ai-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">
                    Verification code
                  </span>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    className="ai-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </label>

                <button
                  onClick={verifyOtp}
                  disabled={loading || !otp}
                  className="ai-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>

                <button
                  onClick={() => setStep("email")}
                  disabled={loading}
                  className="ai-button-secondary w-full"
                >
                  Back to email
                </button>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-white/55">
              Make sure your webcam, microphone, and browser permissions are enabled
              before starting the exam.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepChip({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
          : "border border-white/[0.06] bg-white/[0.03] text-white/45"
      }`}
    >
      {label}
    </div>
  );
}

function FeatureCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}