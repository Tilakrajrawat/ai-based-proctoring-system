"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";

type MyExam = {
  examId: string;
  role: ExamRole;
};

const API = "http://localhost:8080";

export default function DashboardPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

      useEffect(() => {
        if (!token) {
          router.replace("/login");
          return;
        }
      
        const load = async () => {
          const res = await axios.get<MyExam[]>(
            `${API}/api/my-exams`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setExams(res.data);
          setLoading(false);
        };
      
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
      }, [router, token]);
  const createExam = async () => {
    if (!token) return;

    setCreating(true);
    try {
      const res = await axios.post(
        `${API}/api/exams`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push(`/admin/${res.data.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Your Exams</h1>

      <button
        onClick={createExam}
        disabled={creating}
        style={{ padding: "8px 14px", marginBottom: 24 }}
      >
        {creating ? "Creating…" : "Create New Exam"}
      </button>

      {exams.length === 0 && <p>No exams assigned yet.</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {exams.map(exam => (
          <div
            key={exam.examId}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, wordBreak: "break-all" }}>
              {exam.examId}
            </div>

            <div style={{ margin: "8px 0" }}>
              Role: <strong>{exam.role}</strong>
            </div>

            <button
              onClick={() => {
                if (exam.role === "ADMIN")
                  router.push(`/admin/${exam.examId}`);
                else if (exam.role === "PROCTOR")
                  router.push(`/proctor/${exam.examId}`);
                else
                  router.push(`/exam/${exam.examId}`);
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