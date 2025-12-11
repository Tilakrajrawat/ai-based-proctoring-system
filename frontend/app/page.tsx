"use client";

import { useEffect, useState } from "react";
import axios from "axios";

/* =====================
   Types
===================== */

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED";

interface ExamSession {
  id: string;
  studentId: string;
  examId: string;
  status: SessionStatus;
  totalSeverity: number;
  lastHeartbeatAt: string;
}

/* =====================
   Config
===================== */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL!;

/* =====================
   Page
===================== */

export default function ProctorDashboard() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* =====================
     Load sessions
  ===================== */

  const fetchSessions = async () => {
    try {
      const res = await axios.get<ExamSession[]>(
        `${API_BASE}/sessions/all`
      );
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to load sessions", err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  /* =====================
     Update session status
  ===================== */

  const updateStatus = async (
    sessionId: string,
    action: "SUSPEND" | "RESUME" | "END"
  ) => {
    try {
      const endpoint =
        action === "SUSPEND"
          ? `/sessions/suspend/${sessionId}`
          : action === "RESUME"
          ? `/sessions/resume/${sessionId}`
          : `/sessions/end/${sessionId}`;

      await axios.post(`${API_BASE}${endpoint}`);
      await fetchSessions(); // refresh UI
    } catch (err) {
      console.error("Failed to update session", err);
      alert("Action failed");
    }
  };

  /* =====================
     Render states
  ===================== */

  if (loading) {
    return <div className="p-6">Loading sessions…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">
        Proctor Dashboard
      </h1>

      {sessions.length === 0 ? (
        <p>No active sessions.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border rounded-lg p-4 shadow"
            >
              <p className="text-xs text-gray-500 mb-1">
                Session ID
              </p>
              <p className="font-mono text-xs break-all mb-2">
                {session.id}
              </p>

              <p>
                <strong>Student:</strong> {session.studentId}
              </p>

              <p>
                <strong>Exam:</strong> {session.examId}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    session.status === "ACTIVE"
                      ? "text-green-600"
                      : session.status === "SUSPENDED"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }
                >
                  {session.status}
                </span>
              </p>

              <p>
                <strong>Total Severity:</strong>{" "}
                {session.totalSeverity.toFixed(2)}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                Last heartbeat:{" "}
                {new Date(
                  session.lastHeartbeatAt
                ).toLocaleTimeString()}
              </p>

              {/* =====================
                  Action buttons
              ===================== */}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    updateStatus(session.id, "SUSPEND")
                  }
                  disabled={session.status !== "ACTIVE"}
                  className="px-2 py-1 text-sm bg-yellow-500 text-white rounded disabled:opacity-50"
                >
                  Suspend
                </button>

                <button
                  onClick={() =>
                    updateStatus(session.id, "RESUME")
                  }
                  disabled={session.status !== "SUSPENDED"}
                  className="px-2 py-1 text-sm bg-green-600 text-white rounded disabled:opacity-50"
                >
                  Resume
                </button>

                <button
                  onClick={() =>
                    updateStatus(session.id, "END")
                  }
                  disabled={session.status === "ENDED"}
                  className="px-2 py-1 text-sm bg-red-600 text-white rounded disabled:opacity-50"
                >
                  End
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
