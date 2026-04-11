"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStompClient } from "../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";
import { AttendanceSummary, LiveAnalytics, StudentProgress } from "../../../lib/exam-types";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Row = {
  sessionId: string | null;
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
  totalSeverity: number;
};

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!examId) return;

    try {
      const [attendanceRes, summaryRes, analyticsRes, progressRes] = await Promise.all([
        api.get<Row[]>(`/api/exams/${examId}/attendance`),
        api.get<AttendanceSummary>(`/api/exams/${examId}/attendance/summary`),
        api.get<LiveAnalytics>(`/api/analytics/exam/${examId}/live`),
        api.get<StudentProgress[]>(`/api/exams/${examId}/progress`),
      ]);
      setRows(attendanceRes.data);
      setSummary(summaryRes.data);
      setAnalytics(analyticsRes.data);
      setProgress(progressRes.data);
      setError("");
    } catch {
      setError("Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessions", (message) => {
        const session = JSON.parse(message.body) as {
          id: string;
          status: SessionStatus;
          lastHeartbeatAt: string;
          totalSeverity?: number;
        };

        setRows((prev) =>
          prev.map((row) =>
            row.sessionId === session.id
              ? {
                  ...row,
                  status: session.status,
                  lastHeartbeatAt: session.lastHeartbeatAt,
                  totalSeverity: session.totalSeverity ?? row.totalSeverity,
                }
              : row
          )
        );
      });
    });

    return () => {
      client.deactivate();
    };
  }, []);

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
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Proctor Dashboard</h1>
      <div className="text-xs text-gray-400">Exam ID: {examId}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat label="Registered" value={summary?.totalRegisteredStudents ?? stats.total} />
        <Stat label="Present" value={summary?.present ?? stats.present} />
        <Stat label="Absent" value={summary?.absent ?? stats.absent} />
        <Stat label="Active" value={analytics?.activeSessions ?? stats.active} />
        <Stat label="Suspended" value={analytics?.suspendedSessions ?? stats.suspended} />
        <Stat label="High Risk" value={analytics?.highRiskSessions ?? 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Avg Risk" value={(analytics?.averageRiskScore ?? 0).toFixed(2)} />
        <Stat label="Total Incidents" value={analytics?.totalIncidents ?? 0} />
        <Stat label="Inactive/Ended" value={summary?.inactive ?? 0} />
      </div>

      <div className="border rounded p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Student Progress (sanitized)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="py-2">Student</th><th>Attempted</th><th>Submitted</th><th>Session</th><th>Risk</th><th>Incidents</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((p) => (
              <tr key={p.studentId} className="border-b border-gray-800">
                <td className="py-2">{p.studentId}</td>
                <td>{p.attemptedCount}/{p.totalQuestions}</td>
                <td>{p.submitted ? "Yes" : "No"}</td>
                <td>{p.sessionStatus}</td>
                <td>{p.riskScore.toFixed(2)}</td>
                <td>{p.incidentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Live Session Controls</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="py-2">Email</th><th>Status</th><th>Last Seen</th><th>Severity</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const terminal = row.status === "ENDED" || row.status === "SUBMITTED";
              return (
                <tr key={row.sessionId ?? row.email} className="border-b border-gray-800">
                  <td className="py-2">{row.email}</td>
                  <td>{row.status ?? "-"}</td>
                  <td>{row.lastHeartbeatAt ? new Date(row.lastHeartbeatAt).toLocaleTimeString() : "-"}</td>
                  <td>{row.totalSeverity?.toFixed(2) ?? "0.00"}</td>
                  <td className="space-x-2">
                    {row.sessionId && <button onClick={() => router.push(`/proctor/${examId}/live/${row.sessionId}`)} className="underline">Live</button>}
                    {row.sessionId && <button onClick={() => router.push(`/proctor/${examId}/incidents/${row.sessionId}`)} className="underline">Incidents</button>}
                    {!terminal && row.status === "ACTIVE" && <button onClick={() => act(row.sessionId, "suspend")} className="text-amber-300">Suspend</button>}
                    {!terminal && row.status === "SUSPENDED" && <button onClick={() => act(row.sessionId, "resume")} className="text-emerald-300">Resume</button>}
                    {!terminal && <button onClick={() => act(row.sessionId, "submit")} className="text-red-300">Force Submit</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
