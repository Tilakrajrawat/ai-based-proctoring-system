"use client";

import { useEffect, useState } from "react";
import { createStompClient } from "../../../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeaders, getAuthToken } from "../../../../../lib/auth";
import IncidentTimeline from "../../../../../components/IncidentTimeline";

type Incident = {
  id: string;
  type: string;
  incidentType?: string;
  confidence: number;
  severity: number;
  timestamp?: string;
  createdAt: string;
  videoSnippetUrl?: string;
  sessionId?: string;
};

export default function ProctorIncidentsPage() {
  const { examId, sessionId } = useParams<{
    examId: string;
    sessionId: string;
  }>();

  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!getAuthToken()) return;

      const res = await fetch(`http://localhost:8080/api/incidents/session/${sessionId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      setIncidents(data);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);


  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidents", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        if (incident.sessionId !== sessionId) return;
        setIncidents((prev) => [incident, ...prev]);
      });
    });

    return () => client.deactivate();
  }, [sessionId]);
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <button onClick={() => router.back()} className="mb-4 rounded-lg border border-white/20 px-3 py-1">← Back</button>

      <h1 className="text-2xl font-semibold">Live Incidents</h1>
      <div className="mb-4 text-xs text-slate-300">Exam: {examId} • Session: {sessionId}</div>

      {loading && <p>Loading…</p>}
      {!loading && incidents.length === 0 && <p className="mt-2">No incidents detected</p>}

      {!loading && incidents.length > 0 && <IncidentTimeline incidents={incidents} />}
    </div>
  );
}
