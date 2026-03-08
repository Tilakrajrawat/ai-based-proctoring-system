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
  type: string;
  confidence: number;
  severity: number;
  timestamp?: string;
  createdAt?: string;
  videoSnippetUrl?: string;
};

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!examId) return;

    try {
      const res = await api.get<Row[]>(`/api/exams/${examId}/attendance`);
      setRows(res.data);
      setError("");
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const loadIncidents = useCallback(async () => {
    if (!selectedSession) return;
    const res = await api.get<Incident[]>(`/api/incidents/session/${selectedSession}`);
    setIncidents(res.data);
  }, [selectedSession]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessions", (message) => {
        const session = JSON.parse(message.body) as { id: string; status: SessionStatus; lastHeartbeatAt: string; totalSeverity?: number };
        setRows((prev) =>
          prev.map((row) =>
            row.sessionId === session.id
              ? { ...row, status: session.status, lastHeartbeatAt: session.lastHeartbeatAt, totalSeverity: session.totalSeverity ?? row.totalSeverity }
              : row
          )
        );
      });

      connectedClient.subscribe("/topic/incidents", (message) => {
        const incident = JSON.parse(message.body) as Incident & { sessionId?: string };
        if (incident.sessionId && incident.sessionId === selectedSession) {
          setIncidents((prev) => [incident, ...prev]);
        }
      });
    });

    return () => client.deactivate();
  }, [selectedSession]);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.attended).length;
    const absent = total - present;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const suspended = rows.filter((r) => r.status === "SUSPENDED").length;

    return { total, present, absent, active, suspended };
  }, [rows]);

  const act = async (sessionId: string | null, action: "suspend" | "resume" | "submit") => {
    if (!examId || !sessionId) return;

    await api.post(`/api/proctor/exams/${examId}/students/${sessionId}/${action}`, {});
    load();
  };

  if (!examId) return <div className="p-6">Invalid exam</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <button onClick={() => router.back()} className="mb-3 rounded-lg border border-white/20 px-3 py-1">← Back</button>
      <h1 className="text-2xl font-bold">Proctor Dashboard</h1>
      <div className="mb-4 text-xs text-slate-300">Exam ID: {examId}</div>

      <div className="mb-4 flex gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Suspended" value={stats.suspended} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
          <h3 className="mb-3 font-semibold">Session List</h3>
          <div className="space-y-2">
            {rows.map((row) => {
              const terminal = row.status === "ENDED" || row.status === "SUBMITTED";
              return (
                <div key={row.sessionId ?? row.email} className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <button className="text-left" onClick={() => setSelectedSession(row.sessionId)}>
                    <div className="font-medium">{row.email}</div>
                    <div className="text-xs text-slate-300">{row.status ?? "-"} • Severity {row.totalSeverity?.toFixed(2) ?? "0.00"}</div>
                  </button>
                  {row.sessionId && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button onClick={() => router.push(`/proctor/${examId}/live/${row.sessionId}`)} className="rounded border border-white/20 px-2 py-1">Live</button>
                      <button onClick={() => router.push(`/proctor/session/${row.sessionId}`)} className="rounded border border-white/20 px-2 py-1">Inspect</button>
                      {!terminal && row.status === "ACTIVE" && <button onClick={() => act(row.sessionId, "suspend")} className="rounded border border-white/20 px-2 py-1">Suspend</button>}
                      {!terminal && row.status === "SUSPENDED" && <button disabled={(row.totalSeverity ?? 0) >= 2.0} onClick={() => act(row.sessionId, "resume")} className="rounded border border-white/20 px-2 py-1">Resume</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
          <h3 className="mb-3 font-semibold">Live Feed Panel</h3>
          <p className="text-sm text-slate-300">Select a student and open live feed for full WebRTC monitoring.</p>
          {selectedSession && (
            <button onClick={() => router.push(`/proctor/${examId}/live/${selectedSession}`)} className="mt-3 rounded-lg border border-white/20 px-3 py-1">Open Live Feed</button>
          )}
        </div>

        <IncidentTimeline incidents={incidents} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-24 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-lg backdrop-blur-xl"><div className="text-xs text-slate-300">{label}</div><div className="text-xl font-semibold">{value}</div></div>;
}
