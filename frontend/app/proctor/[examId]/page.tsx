"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStompClient } from "../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";
import IncidentTimeline from "../../../components/IncidentTimeline";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Row = {
  sessionId: string | null;
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
  totalSeverity: number;
};

type Incident = {
  id: string;
  sessionId: string;
  type: string;
  confidence: number;
  severity: number;
  timestamp: string;
  videoSnippetUrl?: string;
};

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const load = useCallback(async () => {
    if (!examId) return;
    const res = await api.get<Row[]>(`/api/exams/${examId}/attendance`);
    setRows(res.data);
  }, [examId]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }

    const timeout = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timeout);
  }, [router, load]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessionUpdated", (message) => {
        const session = JSON.parse(message.body) as { id: string; status: SessionStatus; lastHeartbeatAt: string; totalSeverity?: number };
        setRows((prev) =>
          prev.map((row) =>
            row.sessionId === session.id
              ? { ...row, status: session.status, lastHeartbeatAt: session.lastHeartbeatAt, totalSeverity: session.totalSeverity ?? row.totalSeverity }
              : row
          )
        );
      });
      connectedClient.subscribe("/topic/riskScoreUpdated", (message) => {
        const payload = JSON.parse(message.body) as { sessionId: string; riskScore: number };
        setRows((prev) => prev.map((row) => (row.sessionId === payload.sessionId ? { ...row, totalSeverity: payload.riskScore } : row)));
      });
      connectedClient.subscribe("/topic/incidentDetected", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        setIncidents((prev) => [...prev, incident].slice(-50));
      });
    });

    return () => client.deactivate();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.attended).length;
    const suspended = rows.filter((r) => r.status === "SUSPENDED").length;
    return { total, present, suspended };
  }, [rows]);

  if (!examId) return <div className="p-6">Invalid exam</div>;

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white p-6 space-y-4">
      <h1 className="text-2xl font-bold">Proctor Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Sessions" value={stats.total} color="text-green-300" />
        <Stat label="Present" value={stats.present} color="text-yellow-300" />
        <Stat label="Suspended" value={stats.suspended} color="text-red-300" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">
          <h2 className="font-semibold mb-3">Sessions List</h2>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {rows.map((row) => (
              <div key={row.sessionId ?? row.email} className="bg-white/5 rounded-xl border border-white/10 p-3">
                <div className="font-medium">{row.email}</div>
                <div className="text-xs text-white/70">{row.status ?? "NOT_STARTED"} • Risk {row.totalSeverity.toFixed(1)}</div>
                {row.sessionId && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button className="text-xs px-2 py-1 bg-white/10 rounded" onClick={() => router.push(`/proctor/${examId}/live/${row.sessionId}`)}>Video Feed</button>
                    <button className="text-xs px-2 py-1 bg-white/10 rounded" onClick={() => router.push(`/proctor/session/${row.sessionId}`)}>Inspect</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-center min-h-[300px] text-white/60">
          Select a session to open live video feed.
        </div>

        <div className="xl:col-span-4">
          <IncidentTimeline incidents={incidents} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">
      <div className="text-white/70 text-sm">{label}</div>
      <div className={`text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
