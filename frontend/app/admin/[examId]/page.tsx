"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";

type Assignment = {
  email: string;
  role: ExamRole;
};

export default function AdminExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ExamRole>("STUDENT");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const res = await api.get<Assignment[]>(`/api/exams/${examId}/assignments`);
        setAssignments(res.data);
        setError("");
      } catch (err) {
        console.error("Failed to load assignments", err);
        setError("Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [examId, router]);

  const assignUser = async () => {
    if (!email.trim()) return;

    try {
      setAssigning(true);
      await api.post(`/api/exams/${examId}/assign`, { email, role });

      setAssignments((prev) => {
        const exists = prev.some((a) => a.email === email);
        if (exists) {
          return prev.map((a) => (a.email === email ? { ...a, role } : a));
        }
        return [...prev, { email, role }];
      });

      setEmail("");
      setRole("STUDENT");
    } catch (err) {
      console.error("Assign failed", err);
      setError("Failed to assign user");
    } finally {
      setAssigning(false);
    }
  };

  const updateRole = async (targetEmail: string, newRole: ExamRole) => {
    try {
      await api.put(`/api/exams/${examId}/assignments/${targetEmail}/role`, null, {
        params: { role: newRole },
      });

      setAssignments((prev) =>
        prev.map((a) => (a.email === targetEmail ? { ...a, role: newRole } : a))
      );
    } catch (err) {
      console.error("Role update failed", err);
      setError("Failed to update role");
    }
  };

  const removeUser = async (targetEmail: string) => {
    try {
      await api.delete(`/api/exams/${examId}/assignments/${targetEmail}`);

      setAssignments((prev) => prev.filter((a) => a.email !== targetEmail));
    } catch (err) {
      console.error("Remove failed", err);
      setError("Failed to remove user");
    }
  };

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      students: assignments.filter((a) => a.role === "STUDENT").length,
      proctors: assignments.filter((a) => a.role === "PROCTOR").length,
      admins: assignments.filter((a) => a.role === "ADMIN").length,
    };
  }, [assignments]);

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">Loading exam management...</p>
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
                Exam Management Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Manage Exam
              </h1>
              <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              Configure assignments, attendance, questions, and live monitoring
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Assigned"
            value={stats.total}
            hint="All users in this exam"
            color="text-cyan-300"
          />
          <MetricCard
            title="Students"
            value={stats.students}
            hint="Exam participants"
            color="text-emerald-300"
          />
          <MetricCard
            title="Proctors"
            value={stats.proctors}
            hint="Live invigilators"
            color="text-amber-300"
          />
          <MetricCard
            title="Admins"
            value={stats.admins}
            hint="Admin-level access"
            color="text-violet-300"
          />
        </section>

        {/* Quick Actions */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5">
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">
              Jump to the most important exam workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              title="Attendance"
              subtitle="View present, absent, suspended, and ended sessions"
              buttonText="Open Attendance"
              onClick={() => router.push(`/admin/${examId}/attendance`)}
            />

            <ActionCard
              title="Question Management"
              subtitle="Manage questions, exam content, and results"
              buttonText="Open Questions"
              onClick={() => router.push(`/admin/${examId}/questions`)}
            />

            <ActionCard
              title="Live Proctor View"
              subtitle="Monitor incidents and suspicious activity in real time"
              buttonText="Open Proctor"
              onClick={() => router.push(`/proctor/${examId}`)}
            />

            <ActionCard
              title="Analytics"
              subtitle="Open detailed analytics dashboard for this exam"
              buttonText="Open Analytics"
              onClick={() => router.push(`/admin/analytics?examId=${examId}`)}
            />
          </div>
        </section>

        {/* Assign User */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5">
            <h2 className="section-title">Assign Student / Proctor</h2>
            <p className="section-subtitle">
              Add a user to this exam and choose the access role.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.45fr_0.35fr]">
            <input
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ai-input"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ExamRole)}
              className="ai-input"
            >
              <option value="STUDENT">Student</option>
              <option value="PROCTOR">Proctor</option>
            </select>

            <button
              onClick={assignUser}
              disabled={assigning || !email.trim()}
              className="ai-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assigning ? "Assigning..." : "Assign"}
            </button>
          </div>
        </section>

        {/* Assigned Users */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="section-title">Assigned Users</h2>
              <p className="section-subtitle">
                Update roles or remove students and proctors from this exam.
              </p>
            </div>

            <span className="badge-chip">{assignments.length} users</span>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
              No users assigned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignments.map((a) => {
                const isAdmin = a.role === "ADMIN";

                return (
                  <div
                    key={a.email}
                    className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Assigned User
                        </p>
                        <h3 className="mt-2 break-all text-lg font-semibold text-white">
                          {a.email}
                        </h3>

                        <div className="mt-3">
                          <RoleBadge role={a.role} />
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/55">
                          Admin assignments cannot be modified here
                        </div>
                      ) : (
                        <div className="grid w-full gap-3 md:w-auto md:grid-cols-[180px_120px]">
                          <select
                            value={a.role}
                            onChange={(e) => updateRole(a.email, e.target.value as ExamRole)}
                            className="ai-input"
                          >
                            <option value="STUDENT">Student</option>
                            <option value="PROCTOR">Proctor</option>
                          </select>

                          <button
                            onClick={() => removeUser(a.email)}
                            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                          >
                            Remove
                          </button>
                        </div>
                      )}
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

function ActionCard({
  title,
  subtitle,
  buttonText,
  onClick,
}: {
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/55">{subtitle}</p>
      <button onClick={onClick} className="ai-button-primary mt-5 w-full">
        {buttonText}
      </button>
    </div>
  );
}

function RoleBadge({ role }: { role: ExamRole }) {
  const style =
    role === "ADMIN"
      ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
      : role === "PROCTOR"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {role}
    </span>
  );
}