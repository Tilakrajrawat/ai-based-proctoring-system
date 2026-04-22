"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStompClient } from "../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";
import {
  AttendanceSummary,
  LiveAnalytics,
  StudentProgress,
} from "../../../lib/exam-types";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Row = {
  sessionId: string | null;
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
  totalSeverity: number;
};

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!examId) return;

    try {
      const [attendanceRes, summaryRes, analyticsRes, progressRes] = await Promise.all([
        api.get<Row[]>(`/api/exams/${examId}/attendance`),
        api.get<AttendanceSummary>(`/api/exams/${examId}/attendance/summary`),
        api.get<LiveAnalytics>(`/api/analytics/exam/${examId}/live`),
        api.get<StudentProgress[]>(`/api/exams/${examId}/progress`),
      ]);

      setRows(attendanceRes.data);
      setSummary(summaryRes.data);
      setAnalytics(analyticsRes.data);
      setProgress(progressRes.data);
      setError("");
    } catch (err) {
      console.error("Failed to load monitoring data", err);
      setError("Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    void load();
  }, [router, load]);

  // Full dashboard polling so summary / analytics / progress stay fresh
  useEffect(() => {
    if (!examId) return;

    const interval = setInterval(() => {
      void load();
    }, 5000);

    return () => clearInterval(interval);
  }, [examId, load]);

  // Live session row updates
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessions", (message) => {
        const session = JSON.parse(message.body) as {
          id: string;
          status: SessionStatus;
          lastHeartbeatAt: string;
          totalSeverity?: number;
        };

        setRows((prev) =>
          prev.map((row) =>
            row.sessionId === session.id
              ? {
                  ...row,
                  status: session.status,
                  lastHeartbeatAt: session.lastHeartbeatAt,
                  totalSeverity: session.totalSeverity ?? row.totalSeverity,
                }
              : row
          )
        );
      });
    });

    return () => {
      void client.deactivate();
    };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.attended).length;
    const absent = total - present;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const suspended = rows.filter((r) => r.status === "SUSPENDED").length;

    return { total, present, absent, active, suspended };
  }, [rows]);

  const act = async (
    sessionId: string | null,
    action: "suspend" | "resume" | "submit"
  ) => {
    if (!examId || !sessionId) return;

    const key = `${sessionId}-${action}`;

    try {
      setActionLoadingKey(key);
      setError("");

      await api.post(`/api/proctor/exams/${examId}/students/${sessionId}/${action}`, {});
      await load();
    } catch (err) {
      console.error(`Failed to ${action} session`, err);
      setError(`Failed to ${action} session`);
    } finally {
      setActionLoadingKey(null);
    }
  };

  if (!examId) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Invalid Exam</h1>
          <p className="mt-3 text-white/60">This proctor route is invalid.</p>
          <button onClick={() => router.back()} className="ai-button-primary mt-6">
            Go Back
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">
            Loading live proctor dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error && rows.length === 0 && !summary && !analytics && progress.length === 0) {
    return (
      <main className="page-shell px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="glass-card accent-border p-5 md:p-6">
            <button
              onClick={() => router.back()}
              className="mb-3 text-sm text-white/60 transition hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-semibold text-white">Proctor Dashboard</h1>
            <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
          </section>

          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {error}
          </section>
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
                Live Monitoring & Session Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Proctor Dashboard
              </h1>
              <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
                Live STOMP session updates enabled
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
                Full dashboard auto-refresh every 5s
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </section>
        )}

        {/* Primary Metrics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Registered"
            value={summary?.totalRegisteredStudents ?? stats.total}
            hint="Assigned for this exam"
            color="text-cyan-300"
          />
          <MetricCard
            title="Present"
            value={summary?.present ?? stats.present}
            hint="Joined sessions"
            color="text-emerald-300"
          />
          <MetricCard
            title="Absent"
            value={summary?.absent ?? stats.absent}
            hint="No attendance activity"
            color="text-red-300"
          />
          <MetricCard
            title="Active"
            value={analytics?.activeSessions ?? stats.active}
            hint="Currently in progress"
            color="text-violet-300"
          />
          <MetricCard
            title="Suspended"
            value={analytics?.suspendedSessions ?? stats.suspended}
            hint="Flagged / paused"
            color="text-orange-300"
          />
          <MetricCard
            title="High Risk"
            value={analytics?.highRiskSessions ?? 0}
            hint="Above risk threshold"
            color="text-pink-300"
          />
        </section>

        {/* Secondary Metrics */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MiniInsight
            title="Average Risk Score"
            value={(analytics?.averageRiskScore ?? 0).toFixed(2)}
          />
          <MiniInsight
            title="Total Incidents"
            value={analytics?.totalIncidents ?? 0}
          />
          <MiniInsight
            title="Inactive / Ended"
            value={summary?.inactive ?? 0}
          />
        </section>

        {/* Student Progress */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title">Student Progress</h2>
              <p className="section-subtitle">
                Sanitized attempt progress, session state, risk, and incident counts.
              </p>
            </div>

            <span className="badge-chip">{progress.length} records</span>
          </div>

          {progress.length === 0 ? (
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-8 text-center text-white/60">
              No student progress data available.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-white/[0.04] text-left text-white/70">
                    <tr>
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Attempted</th>
                      <th className="px-4 py-4">Submitted</th>
                      <th className="px-4 py-4">Session</th>
                      <th className="px-4 py-4">Risk</th>
                      <th className="px-4 py-4">Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((p) => (
                      <tr
                        key={p.studentId}
                        className="border-t border-white/6 bg-white/[0.02]"
                      >
                        <td className="px-4 py-4 font-medium text-white">{p.studentId}</td>
                        <td className="px-4 py-4 text-white/80">
                          {p.attemptedCount}/{p.totalQuestions}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              p.submitted
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-white/10 text-white/70"
                            }`}
                          >
                            {p.submitted ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill status={p.sessionStatus as SessionStatus | null} />
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${riskPill(
                              p.riskScore
                            )}`}
                          >
                            {p.riskScore.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-white/80">{p.incidentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Live Session Controls */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title">Live Session Controls</h2>
              <p className="section-subtitle">
                Open live feeds, review incidents, and control sessions in real time.
              </p>
            </div>

            <span className="badge-chip">{rows.length} sessions</span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-8 text-center text-white/60">
              No live sessions available.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const terminal =
                  row.status === "ENDED" || row.status === "SUBMITTED";

                const canOpenLiveFeed =
                  !!row.sessionId && row.status === "ACTIVE";

                const canOpenIncidents = !!row.sessionId;

                return (
                  <div
                    key={row.sessionId ?? row.email}
                    className="rounded-3xl border border-white/6 bg-white/[0.03] p-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
                      {/* Session Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={row.status} />
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              row.attended
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-red-500/10 text-red-300"
                            }`}
                          >
                            {row.attended ? "Present" : "Absent"}
                          </span>
                          {row.sessionId && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                              Session Assigned
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 break-all text-lg font-semibold text-white">
                          {row.email}
                        </h3>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoTile
                            label="Last Seen"
                            value={
                              row.lastHeartbeatAt
                                ? new Date(row.lastHeartbeatAt).toLocaleTimeString()
                                : "-"
                            }
                          />
                          <InfoTile
                            label="Total Severity"
                            value={Number(row.totalSeverity ?? 0).toFixed(2)}
                          />
                        </div>

                        {row.status === "SUBMITTED" && (
                          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
                            Student has submitted the exam. Live feed is disabled.
                          </div>
                        )}

                        {row.status === "ENDED" && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                            Session has ended. Live feed is no longer available.
                          </div>
                        )}

                        {!row.sessionId && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
                            No active session started yet for this student.
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <button
                          disabled={!canOpenLiveFeed}
                          onClick={() =>
                            row.sessionId &&
                            router.push(`/proctor/${examId}/live/${row.sessionId}`)
                          }
                          className="ai-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {row.status === "SUBMITTED"
                            ? "Submitted"
                            : row.status === "ENDED"
                            ? "Session Ended"
                            : !row.sessionId
                            ? "No Live Feed"
                            : "Live Feed"}
                        </button>

                        <button
                          disabled={!canOpenIncidents}
                          onClick={() =>
                            row.sessionId &&
                            router.push(`/proctor/${examId}/incidents/${row.sessionId}`)
                          }
                          className="ai-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          View Incidents
                        </button>

                        {!terminal && row.status === "ACTIVE" && (
                          <button
                            onClick={() => act(row.sessionId, "suspend")}
                            disabled={actionLoadingKey === `${row.sessionId}-suspend`}
                            className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-300 transition hover:bg-orange-500/15 disabled:opacity-50"
                          >
                            {actionLoadingKey === `${row.sessionId}-suspend`
                              ? "Suspending..."
                              : "Suspend"}
                          </button>
                        )}

                        {!terminal && row.status === "SUSPENDED" && (
                          <button
                            onClick={() => act(row.sessionId, "resume")}
                            disabled={actionLoadingKey === `${row.sessionId}-resume`}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                          >
                            {actionLoadingKey === `${row.sessionId}-resume`
                              ? "Resuming..."
                              : "Resume"}
                          </button>
                        )}

                        {!terminal && (
                          <button
                            onClick={() => act(row.sessionId, "submit")}
                            disabled={actionLoadingKey === `${row.sessionId}-submit`}
                            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                          >
                            {actionLoadingKey === `${row.sessionId}-submit`
                              ? "Submitting..."
                              : "Force Submit"}
                          </button>
                        )}

                        {terminal && (
                          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
                            This session is in a terminal state and can no longer be controlled.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
}: {
  title: string;
  value: string | number;
  hint: string;
  color: string;
}) {
  return (
    <div className="glass-card-soft accent-border p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className={`mt-3 text-4xl font-semibold tracking-tight ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-white/55">{hint}</p>
    </div>
  );
}

function MiniInsight({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: SessionStatus | null }) {
  if (!status) {
    return (
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">
        -
      </span>
    );
  }

  const style =
    status === "ACTIVE"
      ? "bg-emerald-500/10 text-emerald-300"
      : status === "SUSPENDED"
      ? "bg-orange-500/10 text-orange-300"
      : status === "SUBMITTED"
      ? "bg-cyan-500/10 text-cyan-300"
      : "bg-white/10 text-white/70";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>{status}</span>;
}

function riskPill(risk: number) {
  if (risk < 30) return "bg-emerald-500/10 text-emerald-300";
  if (risk < 60) return "bg-yellow-500/10 text-yellow-300";
  if (risk < 90) return "bg-orange-500/10 text-orange-300";
  return "bg-red-500/10 text-red-300";
}