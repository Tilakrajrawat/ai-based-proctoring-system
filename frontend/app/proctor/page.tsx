"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Client, Frame } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED";

interface ExamSession {
  id: string;
  studentId: string;
  examId: string;
  status: SessionStatus;
  totalSeverity: number;
  lastHeartbeatAt: string;
}

interface IncidentAlert {
  id: string;
  sessionId: string;
  type: string;
  confidence: number;
  severity: number;
  detectedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL!;
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL!;

export default function ProctorPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get<ExamSession[]>(`${API_BASE}/sessions/all`, {
        timeout: 5000,
      });
      setSessions(res.data);
      setError(null);
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    let base = WS_BASE;
    if (base.startsWith("ws:")) base = base.replace("ws:", "http:");
    if (base.startsWith("wss:")) base = base.replace("wss:", "https:");

    const client = new Client({
      webSocketFactory: () => new SockJS(`${base}/ws`),
      reconnectDelay: 3000,
      debug: () => {},
    });

    client.onConnect = (_frame: Frame) => {
      client.subscribe("/topic/incidents", (message) => {
        const incident: IncidentAlert = JSON.parse(message.body);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === incident.sessionId
              ? {
                  ...session,
                  totalSeverity: incident.severity,
                  status:
                    incident.type === "SESSION_AUTO_SUSPEND"
                      ? "SUSPENDED"
                      : session.status,
                }
              : session
          )
        );
      });

      client.subscribe("/topic/sessions", (message) => {
        const updatedSession: ExamSession = JSON.parse(message.body);

        setSessions((prev) =>
          prev.map((session) =>
            session.id === updatedSession.id ? updatedSession : session
          )
        );
      });
      client.subscribe("/topic/sessions", message => {
        try {
          const updatedSession: ExamSession = JSON.parse(message.body);
      
          setSessions(prev =>
            prev.map(s =>
              s.id === updatedSession.id ? updatedSession : s
            )
          );
        } catch (e) {
          console.error(e);
        }
      });
      
    };

    client.activate();

    return () => {
      if (client.active) client.deactivate();
    };
  }, []);

  const updateStatus = async (
    sessionId: string,
    action: "SUSPEND" | "RESUME" | "END"
  ) => {
    try {
      setLoading(true);

      const endpoint =
        action === "SUSPEND"
          ? `/sessions/suspend/${sessionId}`
          : action === "RESUME"
          ? `/sessions/resume/${sessionId}`
          : `/sessions/end/${sessionId}`;

      await axios.post(`${API_BASE}${endpoint}`, null, {
        timeout: 5000,
      });

      await fetchSessions();
    } catch {
      setError("Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading sessions…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Proctor Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`rounded-xl p-5 border-2 shadow transition ${
              session.totalSeverity >= 2
                ? "border-red-600 bg-red-50"
                : session.totalSeverity >= 1.5
                ? "border-yellow-500 bg-yellow-50"
                : "border-gray-200"
            }`}
          >
            <p className="text-xs text-gray-400 mb-2">
              Session ID: {session.id}
            </p>

            <p className="font-semibold">Student: {session.studentId}</p>

            <p className="text-sm mb-2">Exam: {session.examId}</p>

            <p className="mb-2">
              Status: <span className="font-bold">{session.status}</span>
            </p>

            <p className="font-bold">
              Severity: {session.totalSeverity.toFixed(2)}
            </p>

            {session.totalSeverity >= 2 && (
              <span className="inline-block mt-2 px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                AUTO-SUSPEND THRESHOLD
              </span>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => updateStatus(session.id, "SUSPEND")}
                disabled={session.status !== "ACTIVE"}
                className="px-3 py-1 bg-yellow-500 text-white rounded disabled:opacity-30"
              >
                Suspend
              </button>

              <button
                onClick={() => updateStatus(session.id, "RESUME")}
                disabled={
                  session.status !== "SUSPENDED" ||
                  session.totalSeverity >= 2 ||
                  loading
                }                
                className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-30"
              >
                Resume
              </button>

              <button
                onClick={() => updateStatus(session.id, "END")}
                disabled={session.status === "ENDED"}
                className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-30"
              >
                End
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
