"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

type ExamItem = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadExams = async () => {
      try {
        // Change this if your backend uses another endpoint
        const res = await api.get<ExamItem[]>("/api/exams");
        setExams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load exams", err);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  const filteredExams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exams;

    return exams.filter((exam) => {
      const title = (exam.title || exam.name || "").toLowerCase();
      const desc = (exam.description || "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [exams, query]);

  return (
    <main className="page-shell px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Bar */}
        <header className="glass-card accent-border flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Admin Control Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Exam Management Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Manage exams, monitor performance, and review AI proctoring analytics.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="ai-button-secondary">Create Exam</button>
            <button
              onClick={() => router.push("/admin/analytics")}
              className="ai-button-primary"
            >
              Open Analytics
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Exams"
            value={exams.length}
            hint="All created assessments"
            color="text-cyan-300"
          />
          <StatCard
            title="Active Exams"
            value={exams.filter((e) => (e.status || "").toUpperCase() === "ACTIVE").length}
            hint="Currently running"
            color="text-emerald-300"
          />
          <StatCard
            title="Scheduled"
            value={exams.filter((e) => (e.status || "").toUpperCase() === "SCHEDULED").length}
            hint="Upcoming sessions"
            color="text-amber-300"
          />
          <StatCard
            title="Completed"
            value={exams.filter((e) => (e.status || "").toUpperCase() === "COMPLETED").length}
            hint="Finished assessments"
            color="text-violet-300"
          />
        </section>

        {/* Search + Quick Info */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="glass-card-soft accent-border p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="section-title">Available Exams</h2>
                <p className="section-subtitle">
                  Select an exam to open detailed analytics.
                </p>
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exams..."
                className="ai-input w-full md:max-w-xs"
              />
            </div>
          </div>

          <div className="glass-card-soft accent-border p-5">
            <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            <div className="mt-4 grid gap-3">
              <button className="ai-button-secondary justify-start">Manage Students</button>
              <button className="ai-button-secondary justify-start">Review Incidents</button>
              <button className="ai-button-secondary justify-start">Export Reports</button>
            </div>
          </div>
        </section>

        {/* Exam Cards */}
        <section className="glass-card accent-border p-5 md:p-6">
          {loading ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              Loading exams...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              No exams found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredExams.map((exam) => {
                const title = exam.title || exam.name || `Exam ${exam.id}`;
                const status = (exam.status || "UNKNOWN").toUpperCase();

                return (
                  <div
                    key={exam.id}
                    className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                          Exam ID
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
                      </div>
                      <StatusPill status={status} />
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-[40px] text-sm text-white/55">
                      {exam.description || "No description available."}
                    </p>

                    <div className="mt-5 grid gap-2 text-sm text-white/65">
                      <div className="flex justify-between gap-4">
                        <span>Duration</span>
                        <span>{exam.durationMinutes ? `${exam.durationMinutes} min` : "-"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Start</span>
                        <span>{formatDate(exam.startTime)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>End</span>
                        <span>{formatDate(exam.endTime)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={() => router.push(`/admin/analytics?examId=${exam.id}`)}
                        className="ai-button-primary flex-1"
                      >
                        Analytics
                      </button>
                      <button
                        onClick={() => router.push(`/admin/${exam.id}`)}
                        className="ai-button-secondary flex-1"
                      >
                        Details
                      </button>
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

function StatCard({
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

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : status === "SCHEDULED"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
      : status === "COMPLETED"
      ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
      : "bg-white/5 text-white/60 border-white/10";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}