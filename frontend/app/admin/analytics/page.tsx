"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import CheatingTrendChart from "../../../components/CheatingTrendChart";
import { createStompClient } from "../../../lib/stomp";
import { getAuthToken } from "../../../lib/auth";
import { useEffect } from "react";

type Analytics = {
  totalStudents: number;
  suspiciousSessions: number;
  averageRiskScore: number;
  topIncidentTypes: { type: string; count: number }[];
};

type SessionRisk = { sessionId: string; studentId: string; riskScore: number; status: string };

const colors = ["#22c55e", "#eab308", "#fb923c", "#ef4444", "#38bdf8", "#a855f7"];

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [examId, setExamId] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<SessionRisk[]>([]);
  const [trend, setTrend] = useState<{ time: string; incidents: number }[]>([]);

  const load = useCallback(async () => {
    if (!examId) return;
    const [analyticsRes, statsRes, sessionsRes] = await Promise.all([
      api.get(`/api/exams/${examId}/analytics`),
      api.get(`/api/exams/${examId}/incident-stats`),
      api.get(`/api/exams/${examId}/sessions`),
    ]);
    setAnalytics(analyticsRes.data);
    setStats(statsRes.data);
    setSessions(sessionsRes.data);
  }, [examId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connected) => {
      connected.subscribe("/topic/events", (message) => {
        const body = JSON.parse(message.body) as { event: string };
        if (body.event === "incidentDetected") {
          setTrend((prev) => {
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const last = prev[prev.length - 1];
            if (last && last.time === now) {
              return [...prev.slice(0, -1), { ...last, incidents: last.incidents + 1 }];
            }
            return [...prev.slice(-19), { time: now, incidents: 1 }];
          });
        }
        if (body.event === "sessionUpdated" || body.event === "riskScoreUpdated") {
          load();
        }
      });
    });

    return () => client.deactivate();
  }, [examId, load]);

  const pieData = useMemo(() => Object.entries(stats).map(([name, value]) => ({ name, value })), [stats]);

  const heatColor = (riskScore: number) => {
    if (riskScore <= 30) return "bg-green-500/30";
    if (riskScore <= 60) return "bg-yellow-500/30";
    if (riskScore <= 90) return "bg-orange-500/30";
    return "bg-red-500/30";
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <button onClick={() => router.back()} className="mb-3 rounded-lg border border-white/20 px-3 py-1">← Back</button>
      <h1 className="mb-4 text-3xl font-bold">Admin Analytics Dashboard</h1>

      <div className="mb-6 flex gap-3">
        <input value={examId} onChange={(e) => setExamId(e.target.value)} placeholder="Enter exam ID" className="w-80 rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl" />
        <button onClick={load} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">Load Analytics</button>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <GlassStat label="Total Students" value={analytics.totalStudents} />
          <GlassStat label="Suspicious Sessions" value={analytics.suspiciousSessions} />
          <GlassStat label="Average Risk Score" value={analytics.averageRiskScore} />
          <GlassStat label="Incident Types" value={analytics.topIncidentTypes.length} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CheatingTrendChart data={trend} />
        <div className="h-64 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
          <h3 className="mb-2 text-lg font-semibold">Incident Statistics</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie dataKey="value" data={pieData} nameKey="name" outerRadius={80} label>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
        <h3 className="mb-3 text-lg font-semibold">Student Risk Heatmap</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => router.push(`/proctor/session/${session.sessionId}`)}
              className={`rounded-xl border border-white/20 p-3 text-left ${heatColor(session.riskScore)}`}
            >
              <div className="text-sm font-semibold">{session.studentId}</div>
              <div className="text-xs">Risk: {session.riskScore.toFixed(2)}</div>
              <div className="text-xs text-slate-300">{session.status}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GlassStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
