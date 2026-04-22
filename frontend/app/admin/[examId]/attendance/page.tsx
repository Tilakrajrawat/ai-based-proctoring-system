"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { getAuthToken } from "../../../../lib/auth";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Attendance = {
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
};

type NormalizedAttendance = Attendance & {
  present: boolean;
};

export default function AttendancePage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [data, setData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!examId) return;

    try {
      if (!getAuthToken()) {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      const res = await api.get<Attendance[]>(`/api/exams/${examId}/attendance`);
      setData(res.data);
      setError("");
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const normalized: NormalizedAttendance[] = useMemo(
    () =>
      data.map((a) => ({
        ...a,
        present:
          a.attended ||
          a.status === "ACTIVE" ||
          a.status === "SUSPENDED" ||
          a.status === "ENDED" ||
          a.status === "SUBMITTED",
      })),
    [data]
  );

  const total = normalized.length;
  const present = normalized.filter((d) => d.present).length;
  const absent = total - present;
  const active = normalized.filter((d) => d.status === "ACTIVE").length;
  const suspended = normalized.filter((d) => d.status === "SUSPENDED").length;
  const submitted = normalized.filter((d) => d.status === "SUBMITTED").length;

  if (!examId) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Invalid Exam</h1>
          <p className="mt-3 text-white/60">This exam route is invalid.</p>
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
          <p className="text-lg font-medium text-white/80">Loading attendance...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Attendance Unavailable</h1>
          <p className="mt-3 text-red-300">{error}</p>
          <button onClick={() => router.back()} className="ai-button-primary mt-6">
            Back
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
                Live Attendance Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Attendance Dashboard
              </h1>
              <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              Auto-refreshing every 5 seconds
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Total Assigned"
            value={total}
            hint="Users tracked for this exam"
            color="text-cyan-300"
          />
          <MetricCard
            title="Present"
            value={present}
            hint="Joined or active in session"
            color="text-emerald-300"
          />
          <MetricCard
            title="Absent"
            value={absent}
            hint="No session activity detected"
            color="text-red-300"
          />
          <MetricCard
            title="Active"
            value={active}
            hint="Currently in progress"
            color="text-violet-300"
          />
          <MetricCard
            title="Suspended"
            value={suspended}
            hint="Flagged or paused sessions"
            color="text-orange-300"
          />
        </section>

        {/* Secondary Summary */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniInsight title="Submitted Sessions" value={submitted} />
            <MiniInsight
              title="Attendance Rate"
              value={total > 0 ? `${((present / total) * 100).toFixed(1)}%` : "0%"}
            />
            <MiniInsight
              title="Last Refresh"
              value={new Date().toLocaleTimeString()}
            />
          </div>
        </section>

        {/* Table */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title">Student Attendance Table</h2>
              <p className="section-subtitle">
                Real-time session presence, status, and last heartbeat tracking.
              </p>
            </div>

            <span className="badge-chip">{normalized.length} records</span>
          </div>

          {normalized.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              No attendance records available.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/[0.06]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-white/[0.04] text-left text-white/70">
                    <tr>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Present</th>
                      <th className="px-4 py-4">Attendance Flag</th>
                      <th className="px-4 py-4">Session Status</th>
                      <th className="px-4 py-4">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalized.map((a, i) => (
                      <tr
                        key={`${a.email}-${i}`}
                        className="border-t border-white/[0.06] bg-white/[0.02]"
                      >
                        <td className="px-4 py-4 font-medium text-white">{a.email}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              a.present
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-red-500/10 text-red-300"
                            }`}
                          >
                            {a.present ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-white/75">
                          {a.attended ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill status={a.status} />
                        </td>
                        <td className="px-4 py-4 text-white/75">
                          {a.lastHeartbeatAt
                            ? new Date(a.lastHeartbeatAt).toLocaleTimeString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
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