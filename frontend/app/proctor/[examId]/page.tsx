"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStompClient } from "../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";
import IncidentTimeline from "../../../components/IncidentTimeline";
import MetricCard from "../../../components/MetricCard";
import StatusBadge from "../../../components/StatusBadge";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";
type Row = { sessionId: string | null; email: string; attended: boolean; status: SessionStatus | null; lastHeartbeatAt: string | null; totalSeverity: number };
type Incident = { id: string; sessionId: string; type: string; confidence: number; severity: number; timestamp: string; videoSnippetUrl?: string };

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

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
    void load();
  }, [router, load]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessionUpdated", (message) => {
        const session = JSON.parse(message.body) as { id: string; status: SessionStatus; lastHeartbeatAt: string; totalSeverity?: number };
        setRows((prev) => prev.map((row) => (row.sessionId === session.id ? { ...row, status: session.status, lastHeartbeatAt: session.lastHeartbeatAt, totalSeverity: session.totalSeverity ?? row.totalSeverity } : row)));
        setFlashId(session.id);
      });
      connectedClient.subscribe("/topic/riskScoreUpdated", (message) => {
        const payload = JSON.parse(message.body) as { sessionId: string; riskScore: number };
        setRows((prev) => prev.map((row) => (row.sessionId === payload.sessionId ? { ...row, totalSeverity: payload.riskScore } : row)));
        setFlashId(payload.sessionId);
      });
      connectedClient.subscribe("/topic/incidentDetected", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        setIncidents((prev) => [...prev, incident].slice(-50));
      });
    });
    return () => { void client.deactivate(); };
  }, []);

  useEffect(() => {
    if (!flashId) return;
    const timer = setTimeout(() => setFlashId(null), 700);
    return () => clearTimeout(timer);
  }, [flashId]);

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const flagged = rows.filter((r) => r.totalSeverity > 70).length;
    const avg = rows.length ? rows.reduce((sum, r) => sum + r.totalSeverity, 0) / rows.length : 0;
    return { active, incidents: incidents.length, avg, flagged };
  }, [rows, incidents.length]);

  if (!examId) return <div className="p-6">Invalid exam</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-5">
      <h1 className="text-2xl">Proctor Command Center</h1>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Active Students" value={metrics.active} accent="text-emerald-300" />
        <MetricCard label="Incidents" value={metrics.incidents} accent="text-yellow-200" />
        <MetricCard label="Avg Risk" value={metrics.avg.toFixed(1)} accent="text-orange-300" />
        <MetricCard label="Flagged" value={metrics.flagged} accent="text-rose-300" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
        {rows.map((row) => {
          const risk = Math.max(0, Math.min(100, row.totalSeverity));
          const level = risk > 80 ? "critical" : risk > 60 ? "suspicious" : risk > 35 ? "warning" : "safe";
          return (
            <div key={row.sessionId ?? row.email} className={`relative overflow-hidden bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-4 transition ${flashId === row.sessionId ? "ring-2 ring-blue-400/45" : ""} ${risk > 70 ? "shadow-[0_0_30px_rgba(255,23,68,0.25)]" : ""}`}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="h-28 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-sm">Video thumbnail</div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p>{row.email}</p>
                  <p className="text-xs text-white/55 font-mono">Risk {risk.toFixed(1)}</p>
                </div>
                <StatusBadge status={level} />
              </div>
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${risk > 70 ? "bg-rose-400" : risk > 50 ? "bg-orange-400" : risk > 30 ? "bg-yellow-300" : "bg-emerald-400"}`} style={{ width: `${risk}%` }} /></div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {row.sessionId && (
                  <>
                    <button className="px-3 py-1.5 rounded-lg bg-white/10 text-sm hover:bg-white/20 active:scale-[0.98]" onClick={() => router.push(`/proctor/${examId}/live/${row.sessionId}`)}>Live</button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/10 text-sm hover:bg-white/20 active:scale-[0.98]" onClick={() => router.push(`/proctor/session/${row.sessionId}`)}>Inspect</button>
                  </>
                )}
                {risk > 70 && row.sessionId && (
                  <button className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-200 text-sm hover:bg-rose-500/30 active:scale-[0.98]" onClick={() => api.post(`/api/sessions/${row.sessionId}/suspend`)}>Suspend</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <IncidentTimeline incidents={incidents} />
    </div>
  );
}
