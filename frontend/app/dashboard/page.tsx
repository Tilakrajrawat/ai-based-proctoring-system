"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuthToken } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";

type MyExam = {
  examId: string;
  role: ExamRole;
};

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const res = await api.get<MyExam[]>("/api/my-exams");
        setExams(res.data);
        setError("");
      } catch {
        setError("Failed to load exams");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const createExam = async () => {
    setCreating(true);
    try {
      const res = await api.post("/api/exams", {});
      router.push(`/admin/${res.data.id}`);
    } finally {
      setCreating(false);
    }
  };

  const grouped = useMemo(() => {
    return {
      admin: exams.filter((e) => e.role === "ADMIN"),
      proctor: exams.filter((e) => e.role === "PROCTOR"),
      student: exams.filter((e) => e.role === "STUDENT"),
    };
  }, [exams]);

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">Loading your exam workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Unified Exam Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Your Assigned Exams
              </h1>
              <p className="mt-2 text-sm text-white/55">
                Open admin, proctor, or student exam sessions from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={createExam}
                disabled={creating}
                className="ai-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create New Exam"}
              </button>
              <LogoutButton />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Assignments"
            value={exams.length}
            hint="All exams linked to your account"
            color="text-cyan-300"
          />
          <StatCard
            title="Admin Access"
            value={grouped.admin.length}
            hint="Manage and review exams"
            color="text-violet-300"
          />
          <StatCard
            title="Proctor Access"
            value={grouped.proctor.length}
            hint="Live invigilation sessions"
            color="text-amber-300"
          />
          <StatCard
            title="Student Access"
            value={grouped.student.length}
            hint="Attempt assigned exams"
            color="text-emerald-300"
          />
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {exams.length === 0 ? (
          <section className="glass-card accent-border p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">No exams assigned yet</h2>
            <p className="mt-3 text-white/60">
              Create a new exam or wait for an assignment to appear here.
            </p>
          </section>
        ) : (
          <>
            <RoleSection
              title="Admin Exams"
              subtitle="Create, configure, and inspect analytics"
              exams={grouped.admin}
              emptyText="No admin-access exams available."
              onOpen={(examId) => router.push(`/admin/${examId}`)}
              color="violet"
            />

            <RoleSection
              title="Proctor Sessions"
              subtitle="Monitor candidates and watch live incident flow"
              exams={grouped.proctor}
              emptyText="No proctor sessions available."
              onOpen={(examId) => router.push(`/proctor/${examId}`)}
              color="amber"
            />

            <RoleSection
              title="Student Exams"
              subtitle="Open and attempt your assigned assessments"
              exams={grouped.student}
              emptyText="No student exams available."
              onOpen={(examId) => router.push(`/exam/${examId}`)}
              color="emerald"
            />
          </>
        )}
      </div>
    </main>
  );
}

function RoleSection({
  title,
  subtitle,
  exams,
  emptyText,
  onOpen,
  color,
}: {
  title: string;
  subtitle: string;
  exams: MyExam[];
  emptyText: string;
  onOpen: (examId: string) => void;
  color: "violet" | "amber" | "emerald";
}) {
  const accent =
    color === "violet"
      ? "text-violet-300"
      : color === "amber"
      ? "text-amber-300"
      : "text-emerald-300";

  const chip =
    color === "violet"
      ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
      : color === "amber"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

  return (
    <section className="glass-card accent-border p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${chip}`}>
          {exams.length} available
        </span>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-white/55">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <div
              key={exam.examId}
              className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">Exam ID</p>
                  <h3 className="mt-2 break-all text-base font-semibold text-white">
                    {exam.examId}
                  </h3>
                </div>

                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${chip}`}>
                  {exam.role}
                </span>
              </div>

              <div className="mt-5 grid gap-2 text-sm text-white/60">
                <div className="flex justify-between gap-4">
                  <span>Access Type</span>
                  <span className={accent}>{exam.role}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Monitoring</span>
                  <span>Enabled</span>
                </div>
              </div>

              <button onClick={() => onOpen(exam.examId)} className="ai-button-primary mt-5 w-full">
                Open Workspace
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
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