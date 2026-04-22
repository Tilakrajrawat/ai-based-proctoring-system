"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProctorWebRTC } from "../../useProctorWebRTC";
import { getAuthHeaders } from "../../../../../lib/auth";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export default function ProctorLivePage() {
  const { examId, sessionId } = useParams<{ examId: string; sessionId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [status, setStatus] = useState<SessionStatus>("ACTIVE");
  const [loading, setLoading] = useState(true);

  // Only attach WebRTC when session is active
  useProctorWebRTC(examId, status === "ACTIVE" ? sessionId : null, videoRef);

  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const res = await fetch(`${API}/api/sessions/${sessionId}`, {
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setStatus(data.status);
          }
        }
      } catch (err) {
        console.error("Failed to fetch session status", err);
      } finally {
        setLoading(false);
      }
    };

    void loadSession();

    const interval = setInterval(() => {
      void loadSession();
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <main className="page-shell px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="mb-3 text-sm text-white/60 transition hover:text-white"
              >
                ← Back
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Real-Time Monitoring Stream
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Live Feed
              </h1>
              <p className="mt-2 text-sm text-white/55">Exam: {examId}</p>
              <p className="mt-1 break-all text-sm text-white/55">Session: {sessionId}</p>
            </div>

            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                status === "ACTIVE"
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                  : status === "SUSPENDED"
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              Session Status: {status}
            </div>
          </div>
        </section>

        {/* Main Layout */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          {/* Video Panel */}
          <div className="glass-card accent-border p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="section-title">Candidate Live Stream</h2>
                <p className="section-subtitle">
                  Monitor the active WebRTC feed for this session.
                </p>
              </div>

              <span
                className={`badge-chip ${
                  status === "ACTIVE"
                    ? ""
                    : status === "SUSPENDED"
                    ? "!bg-red-500/10 !text-red-300"
                    : "!bg-emerald-500/10 !text-emerald-300"
                }`}
              >
                {status}
              </span>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/6 bg-black/40">
              {loading ? (
                <div className="flex aspect-video items-center justify-center text-sm text-white/55">
                  Loading session status...
                </div>
              ) : status === "ACTIVE" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  controls
                  className="aspect-video w-full bg-black object-cover"
                />
              ) : status === "SUSPENDED" ? (
                <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
                  <p className="text-lg font-semibold text-red-300">Session Suspended</p>
                  <p className="mt-2 text-sm text-white/55">
                    The student session is currently suspended by system or proctor.
                  </p>
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
                  <p className="text-lg font-semibold text-emerald-300">
                    {status === "SUBMITTED" ? "Exam Submitted" : "Session Ended"}
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Live feed is no longer available for this session.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Side Info */}
          <div className="space-y-6">
            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Session Details</h3>
              <p className="section-subtitle">Quick reference for the current monitored session.</p>

              <div className="mt-5 space-y-3">
                <InfoTile label="Exam ID" value={examId} />
                <InfoTile label="Session ID" value={sessionId} />
                <InfoTile label="Transport" value={status === "ACTIVE" ? "WebRTC" : "Inactive"} />
                <InfoTile label="Status" value={status} />
              </div>
            </section>

            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Quick Actions</h3>
              <p className="section-subtitle">Jump to related proctor workflows.</p>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => router.push(`/proctor/${examId}/incidents/${sessionId}`)}
                  className="ai-button-primary"
                >
                  Open Incident Timeline
                </button>

                <button
                  onClick={() => router.push(`/proctor/${examId}`)}
                  className="ai-button-secondary"
                >
                  Back to Proctor Dashboard
                </button>
              </div>
            </section>

            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Monitoring Notes</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                If the session is submitted or ended, the stream is intentionally disabled and only
                post-exam monitoring data should be reviewed.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}