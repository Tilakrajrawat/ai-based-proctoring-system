"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuthToken } from "../../lib/auth";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";
type MyExam = { examId: string; role: ExamRole };

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    api.get<MyExam[]>("/api/my-exams")
      .then((res) => setExams(res.data))
      .finally(() => setLoading(false));
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
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Your Exams</h1>
      <button onClick={createExam} disabled={creating} style={{ padding: "8px 14px", marginBottom: 24 }}>
        {creating ? "Creating…" : "Create New Exam"}
      </button>
      {exams.length === 0 && <p>No exams assigned yet.</p>}
      <div style={{ display: "grid", gap: 16 }}>
        {exams.map((exam) => (
          <div key={exam.examId} style={{ border: "1px solid #ccc", borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 12, wordBreak: "break-all" }}>{exam.examId}</div>
            <div style={{ margin: "8px 0" }}>Role: <strong>{exam.role}</strong></div>
            <button onClick={() => router.push(`/admin/${exam.examId}`)}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}
