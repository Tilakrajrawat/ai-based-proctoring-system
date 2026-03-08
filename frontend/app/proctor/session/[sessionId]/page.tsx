"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import IncidentTimeline from "../../../../components/IncidentTimeline";

type Session = { id: string; studentId: string; examId: string; status: string; totalSeverity: number };
type Incident = { id: string; type: string; confidence: number; severity: number; timestamp?: string; createdAt?: string; videoSnippetUrl?: string };

export default function ProctorSessionInspectionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const load = async () => {
      const [sessionRes, incidentRes] = await Promise.all([
        api.get(`/api/sessions/${sessionId}`),
        api.get(`/api/incidents/session/${sessionId}`),
      ]);
      setSession(sessionRes.data);
      setIncidents(incidentRes.data);
    };
    load();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <button onClick={() => router.back()} className="mb-4 rounded-lg border border-white/20 px-3 py-1">← Back</button>
      <h1 className="text-2xl font-bold">Proctor Session Inspection</h1>
      {session && (
        <div className="my-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
          <p><strong>Student:</strong> {session.studentId}</p>
          <p><strong>Exam:</strong> {session.examId}</p>
          <p><strong>Status:</strong> {session.status}</p>
          <p><strong>Risk score:</strong> {session.totalSeverity.toFixed(2)}</p>
        </div>
      )}
      <IncidentTimeline incidents={incidents} />
    </div>
  );
}
