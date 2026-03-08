"use client";

import { useEffect, useState } from "react";
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

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24 }}>Your Exams</h1>
        <LogoutButton />
      </div>

      <button
        onClick={createExam}
        disabled={creating}
        style={{ padding: "8px 14px", marginBottom: 24 }}
      >
        {creating ? "Creating…" : "Create New Exam"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {exams.length === 0 && <p>No exams assigned yet.</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {exams.map((exam) => (
          <div
            key={exam.examId}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, wordBreak: "break-all" }}>{exam.examId}</div>

            <div style={{ margin: "8px 0" }}>
              Role: <strong>{exam.role}</strong>
            </div>

            <button
              onClick={() => {
                if (exam.role === "ADMIN") router.push(`/admin/${exam.examId}`);
                else if (exam.role === "PROCTOR") router.push(`/proctor/${exam.examId}`);
                else router.push(`/exam/${exam.examId}`);
              }}
            >
              Open
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
