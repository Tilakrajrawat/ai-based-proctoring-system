"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Attendance = {
  studentEmail: string;
  present: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
};

const API = "http://localhost:8080";

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
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Unauthorized");
        return;
      }

      const res = await axios.get<Attendance[]>(
        `${API}/api/exams/${examId}/attendance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setData(res.data);
      setError("");
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (!examId) return <p style={{ padding: 24 }}>Invalid exam</p>;
  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: "red" }}>{error}</p>;

  const normalized = data.map(a => ({
    ...a,
    present:
      a.present ||
      a.status === "ACTIVE" ||
      a.status === "SUSPENDED" ||
      a.status === "ENDED" ||
      a.status === "SUBMITTED",
  }));

  const total = normalized.length;
  const present = normalized.filter(d => d.present).length;
  const absent = total - present;

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => router.back()}>← Back</button>

      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Attendance</h1>

      <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
        <div>Total: {total}</div>
        <div style={{ color: "green" }}>Present: {present}</div>
        <div style={{ color: "red" }}>Absent: {absent}</div>
      </div>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Present</th>
            <th>Status</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {normalized.map((a, i) => (
            <tr key={`${a.studentEmail}-${i}`}>
              <td>{a.studentEmail}</td>
              <td>{a.present ? "Yes" : "No"}</td>
              <td>{a.status ?? "-"}</td>
              <td>
                {a.lastHeartbeatAt
                  ? new Date(a.lastHeartbeatAt).toLocaleTimeString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}