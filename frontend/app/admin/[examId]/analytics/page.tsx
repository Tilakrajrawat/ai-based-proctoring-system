"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";


import api from "../../../../lib/api";
import IncidentStatsChart from "../../../../components/IncidentStatsChart";
import CheatingTrendChart from "../../../../components/CheatingTrendChart";
import { createStompClient } from "../../../../lib/stomp";
import { getAuthToken } from "../../../../lib/auth";

type Analytics = {
  totalStudents: number;
  suspiciousSessions: number;
  averageRiskScore: number;
  topIncidentTypes: { type: string; count: number }[];
};

type SessionSummary = {
  sessionId: string;
  studentId: string;
  riskScore: number;
  status: string;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [trend, setTrend] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD ANALYTICS ---------------- */

  useEffect(() => {
    if (!examId) return;

    const load = async () => {
      try {
        const [a, s, se] = await Promise.all([
          api.get<Analytics>(`/api/exams/${examId}/analytics`),
          api.get<Record<string, number>>(`/api/exams/${examId}/incident-stats`),
          api.get<SessionSummary[]>(`/api/exams/${examId}/sessions`)
        ]);

        setAnalytics(a.data);
        setStats(s.data);
        setSessions(se.data);
      } catch (err) {
        console.error("Analytics load failed", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [examId]);

  /* ---------------- REALTIME INCIDENT TREND ---------------- */

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (msg) => {
        const incident = JSON.parse(msg.body);

        if (incident.examId !== examId) return;

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

    return () => {
      void client.deactivate();
    };
  }, [examId]);

  const topIncidents = useMemo(
    () =>
      analytics?.topIncidentTypes
        ?.map((i) => `${i.type.replaceAll("_", " ")}: ${i.count}`)
        .join(" • ") ?? "-",
    [analytics]
  );

  if (!examId) {
    return <div className="p-6">Missing examId query param.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">

      <button onClick={() => router.back()} className="text-sm underline">
        ← Back
      </button>

      <h1 className="text-2xl font-semibold">Admin Analytics Dashboard</h1>

      {/* Metric Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Total Students" value={analytics?.totalStudents ?? 0} />
        <Card title="Suspicious Sessions" value={analytics?.suspiciousSessions ?? 0} />
        <Card title="Average Risk" value={(analytics?.averageRiskScore ?? 0).toFixed(1)} />
        <Card title="Top Incidents" value={topIncidents} small />
      </div>

      {/* Charts */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CheatingTrendChart points={trend} />
        <IncidentStatsChart stats={stats} />
      </div>

      {/* ---------------- Attendence---------------- */}

      <div>
          <h2 className="text-xl font-semibold mb-3">Student Attendance</h2>
          
      </div>
      {/* Student Risk Grid */}

      <div className="border rounded p-4">
        <h3 className="font-semibold mb-3">Student Risk Heatmap</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {sessions.map((session) => (
            <div key={session.sessionId} className={`border rounded p-3 ${riskClass(session.riskScore)}`}>
              <div className="text-sm">Student</div>
              <div className="font-semibold">{session.studentId}</div>
              <div className="text-sm mt-1">Risk: {session.riskScore.toFixed(1)}</div>
              <div className="text-xs mt-1">Status: {session.status}</div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

function Card({ title, value, small }: { title: string; value: string | number; small?: boolean }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm">{title}</div>
      <div className={`${small ? "text-sm" : "text-2xl"} font-semibold mt-2`}>
        {value}
      </div>
    </div>
  );
}

function riskClass(risk: number) {
  if (risk < 30) return "bg-green-100";
  if (risk < 60) return "bg-yellow-100";
  if (risk < 90) return "bg-orange-100";
  return "bg-red-100";
}