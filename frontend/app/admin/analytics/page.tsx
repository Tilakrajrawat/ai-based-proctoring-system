"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import IncidentStatsChart from "../../../components/IncidentStatsChart";
import CheatingTrendChart from "../../../components/CheatingTrendChart";
import { createStompClient } from "../../../lib/stomp";
import { getAuthToken } from "../../../lib/auth";

type Analytics = {
  totalStudents: number;
  suspiciousSessions: number;
  averageRiskScore: number;
  topIncidentTypes: { type: string; count: number }[];
};

type SessionSummary = {
  sessionId: string;
  studentId: string;
  riskScore: number;
  status: string;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const examId = params.get("examId") ?? "";

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [trend, setTrend] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    const load = async () => {
      try {
        const [a, s, se] = await Promise.all([
          api.get<Analytics>(`/api/exams/${examId}/analytics`),
          api.get<Record<string, number>>(`/api/exams/${examId}/incident-stats`),
          api.get<SessionSummary[]>(`/api/exams/${examId}/sessions`),
        ]);

        setAnalytics(a.data);
        setStats(s.data);
        setSessions(se.data);
      } catch (err) {
        console.error("Analytics load failed", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [examId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !examId) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (msg) => {
        try {
          const incident = JSON.parse(msg.body);

          // If backend sends examId, filter by current exam
          if (incident.examId && incident.examId !== examId) return;
        } catch {
          // Ignore parse issues, still update trend
        }

        setTrend((prev) => {
          const now = new Date();
          const label = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          const next = [...prev];
          const last = next[next.length - 1];

          if (last && last.time === label) {
            last.count += 1;
          } else {
            next.push({ time: label, count: 1 });
          }

          return next.slice(-30);
        });
      });
    });

    return () => {
      void client.deactivate();
    };
  }, [examId]);

  const topIncidents = useMemo(
    () =>
      analytics?.topIncidentTypes
        ?.map((i) => `${i.type.replaceAll("_", " ")}: ${i.count}`)
        .join(" • ") ?? "-",
    [analytics]
  );

  if (!examId) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Missing examId</h1>
          <p className="mt-3 text-white/60">
            Open analytics from the admin dashboard so the selected exam is passed correctly.
          </p>
          <button onClick={() => router.push("/admin")} className="ai-button-primary mt-6">
            Go to Admin Dashboard
          </button>
        </div>
      </main>
    );
  }

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
                Live Exam Analytics
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Proctoring Intelligence Dashboard
              </h1>
              <p className="mt-2 text-sm text-white/55">
                Real-time insights for exam integrity, incidents, and student risk.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              Tracking exam: <span className="font-semibold">{examId}</span>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Students"
            value={analytics?.totalStudents ?? 0}
            hint="Registered in this exam"
            color="text-cyan-300"
          />
          <MetricCard
            title="Suspicious Sessions"
            value={analytics?.suspiciousSessions ?? 0}
            hint="Flagged by AI rules"
            color="text-orange-300"
          />
          <MetricCard
            title="Average Risk"
            value={(analytics?.averageRiskScore ?? 0).toFixed(1)}
            hint="Overall session risk"
            color="text-amber-300"
          />
          <MetricCard
            title="Top Incidents"
            value={topIncidents}
            hint="Most frequent violations"
            color="text-red-300"
            small
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="glass-card accent-border p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Live Incident Trend</h2>
              <p className="text-sm text-white/55">
                Real-time suspicious event count over time
              </p>
            </div>
            <CheatingTrendChart points={trend} />
          </div>

          <div className="glass-card accent-border p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Incident Breakdown</h2>
              <p className="text-sm text-white/55">
                Distribution of incident types detected during the exam
              </p>
            </div>
            <IncidentStatsChart stats={stats} />
          </div>
        </section>

        {/* Student Risk Heatmap */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title">Student Risk Heatmap</h2>
              <p className="section-subtitle">
                Quickly identify high-risk or suspicious sessions.
              </p>
            </div>

            <span className="badge-chip">{sessions.length} sessions loaded</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              Loading analytics...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              No session data found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`rounded-3xl border p-5 transition ${riskClass(session.riskScore)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Student
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">
                        {session.studentId}
                      </h3>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                      {session.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                        Risk Score
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {session.riskScore.toFixed(1)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                        Session ID
                      </p>
                      <p className="mt-2 truncate text-sm font-medium text-white/80">
                        {session.sessionId}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  hint,
  color,
  small,
}: {
  title: string;
  value: string | number;
  hint: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="glass-card-soft accent-border p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className={`mt-3 ${small ? "text-sm leading-6" : "text-4xl"} font-semibold ${color}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-white/55">{hint}</p>
    </div>
  );
}

function riskClass(risk: number) {
  if (risk < 30) {
    return "border-emerald-500/15 bg-emerald-500/10";
  }
  if (risk < 60) {
    return "border-yellow-500/15 bg-yellow-500/10";
  }
  if (risk < 90) {
    return "border-orange-500/15 bg-orange-500/10";
  }
  return "border-red-500/15 bg-red-500/10";
}