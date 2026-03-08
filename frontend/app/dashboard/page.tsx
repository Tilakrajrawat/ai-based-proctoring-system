"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuthToken } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";
import StatusBadge from "../../components/StatusBadge";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";

type MyExam = {
  examId: string;
  role: ExamRole;
};

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

  /* ---------------- AUTH + LOAD EXAMS ---------------- */

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const res = await api.get<MyExam[]>("/api/my-exams");

        if (!active) return;

        setExams(res.data);
        setError("");
      } catch {
        if (active) setError("Failed to load exams");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const interval = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [router]);

  /* ---------------- CREATE EXAM ---------------- */

  const createExam = async () => {
    setCreating(true);

    try {
      const res = await api.post("/api/exams", {});
      router.push(`/admin/${res.data.id}`);
    } catch {
      setError("Failed to create exam");
    } finally {
      setCreating(false);
    }
  };

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-semibold">Exam Dashboard</h1>

        <div className="flex gap-3">
          <button
            onClick={createExam}
            disabled={creating}
            className="border px-4 py-2 rounded"
          >
            {creating ? "Creating..." : "Create Exam"}
          </button>

          <LogoutButton />
        </div>
      </div>

      {/* Error */}

      {error && (
        <div className="border border-red-400 text-red-600 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}

      {exams.length === 0 && (
        <div className="border rounded p-6 text-center text-gray-500">
          No exams available. Create your first exam.
        </div>
      )}

      {/* Exams */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 color">
        {exams.map((exam) => (
          <div
            key={exam.examId}
            className="border rounded p-4 space-y-3"
          >
            <StatusBadge status={roleStatus[exam.role]} />

            <div>
              <p className="font-medium">
                Exam {exam.examId.slice(0, 8)}...
              </p>

              <div className="text-sm text-gray-500 font-mono">
                ID: {exam.examId}
              </div>
            </div>

            <button
              className="border rounded px-3 py-2 w-10px "
              onClick={() => {
                if (exam.role === "ADMIN")
                  router.push(`/admin/${exam.examId}`);
                else if (exam.role === "PROCTOR")
                  router.push(`/proctor/${exam.examId}`);
                else
                  router.push(`/exam/${exam.examId}`);
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