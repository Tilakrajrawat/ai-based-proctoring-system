"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api";
import IncidentStatsChart from "../../../components/IncidentStatsChart";
import CheatingTrendChart from "../../../components/CheatingTrendChart";
import { createStompClient } from "../../../lib/stomp";
import { getAuthToken } from "../../../lib/auth";

type Analytics = {
  totalStudents: number;
  suspiciousSessions: number;
  averageRiskScore: number;
  topIncidentTypes: { type: string; count: number }[];
};

type SessionSummary = { sessionId: string; studentId: string; riskScore: number; status: string };

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [examId, setExamId] = useState("");


  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("examId") ?? "";
    setExamId(id);
  }, []);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [trend, setTrend] = useState<{ time: string; count: number }[]>([]);

  useEffect(() => {
    if (!examId) return;

    const load = async () => {
      const [a, s, se] = await Promise.all([
        api.get<Analytics>(`/api/exams/${examId}/analytics`),
        api.get<Record<string, number>>(`/api/exams/${examId}/incident-stats`),
        api.get<SessionSummary[]>(`/api/exams/${examId}/sessions`),
      ]);
      setAnalytics(a.data);
      setStats(s.data);
      setSessions(se.data);
    };

    load();
  }, [examId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", () => {
        setTrend((prev) => {
          const now = new Date();
          const label = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.time === label) {
            last.count += 1;
          } else {
            next.push({ time: label, count: 1 });
          }
          return next.slice(-30);
        });
      });
    });

    return () => { void client.deactivate(); };
  }, []);

  const topIncidents = useMemo(
    () => analytics?.topIncidentTypes?.map((i) => `${i.type.replaceAll("_", " ")}: ${i.count}`).join(" • ") ?? "-",
    [analytics]
  );

  if (!examId) {
    return <div className="min-h-screen bg-[#0f0f12] text-white p-6">Missing examId query param.</div>;
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white p-6 space-y-6">
      <button onClick={() => router.back()} className="text-white/80 hover:text-white">← Back</button>
      <h1 className="text-2xl font-bold">Admin Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Total Students" value={analytics?.totalStudents ?? 0} color="text-green-300" />
        <Card title="Suspicious Sessions" value={analytics?.suspiciousSessions ?? 0} color="text-orange-300" />
        <Card title="Average Risk" value={(analytics?.averageRiskScore ?? 0).toFixed(1)} color="text-yellow-300" />
        <Card title="Top Incidents" value={topIncidents} color="text-red-300" small />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CheatingTrendChart points={trend} />
        <IncidentStatsChart stats={stats} />
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5">
        <h3 className="text-lg font-semibold mb-4">Student Risk Heatmap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {sessions.map((session) => (
            <div key={session.sessionId} className={`rounded-2xl border border-white/10 p-4 ${riskClass(session.riskScore)}`}>
              <div className="text-sm text-white/70">Student</div>
              <div className="font-semibold">{session.studentId}</div>
              <div className="mt-2 text-sm">Risk: {session.riskScore.toFixed(1)}</div>
              <div className="text-xs text-white/80 mt-1">Status: {session.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, color, small }: { title: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5">
      <div className="text-sm text-white/70">{title}</div>
      <div className={`mt-2 ${small ? "text-sm" : "text-3xl"} font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function riskClass(risk: number) {
  if (risk < 30) return "bg-green-500/15";
  if (risk < 60) return "bg-yellow-500/15";
  if (risk < 90) return "bg-orange-500/15";
  return "bg-red-500/15";
}
