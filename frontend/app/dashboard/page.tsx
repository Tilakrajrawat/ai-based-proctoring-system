"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuthToken } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";
import StatusBadge from "../../components/StatusBadge";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";
type MyExam = { examId: string; role: ExamRole };

const roleStatus: Record<ExamRole, "safe" | "warning" | "suspicious"> = {
  ADMIN: "safe",
  PROCTOR: "warning",
  STUDENT: "suspicious",
};

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
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
    void load();
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

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 space-y-6">
      <div className="sticky top-3 z-20 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-4 flex items-center justify-between">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-2xl">Exam Command Dashboard</h1>
        <div className="flex items-center gap-3">
          <button onClick={createExam} disabled={creating} className="rounded-xl px-4 py-2 bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 active:scale-[0.98] transition">
            {creating ? "Creating..." : "Create Exam"}
          </button>
          <LogoutButton />
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-2">{error}</p>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
        {exams.map((exam) => (
          <div key={exam.examId} className="relative overflow-hidden fade-up bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <StatusBadge status={roleStatus[exam.role]} />
            <p className="mt-4 text-lg font-medium">Exam {exam.examId.slice(0, 8)}…</p>
            <div className="mt-3 text-sm text-white/60 space-y-1 font-mono">
              <p>ID: {exam.examId}</p>
              <p>Duration: 60m</p>
              <p>Questions: 40</p>
            </div>
            <button
              className="mt-5 w-full rounded-xl px-4 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-200 hover:bg-blue-500/25 active:scale-[0.98] transition"
              onClick={() => {
                if (exam.role === "ADMIN") router.push(`/admin/${exam.examId}`);
                else if (exam.role === "PROCTOR") router.push(`/proctor/${exam.examId}`);
                else router.push(`/exam/${exam.examId}`);
              }}
            >
              Enter
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
