"use client";

import { useEffect, useState } from "react";
import { createStompClient } from "../../../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../lib/api";
import { getAuthToken } from "../../../../../lib/auth";
import IncidentTimeline from "../../../../../components/IncidentTimeline";

type Incident = {
  id: string;
  sessionId: string;
  type: string;
  confidence: number;
  severity: number;
  timestamp: string;
  videoSnippetUrl?: string;
};

export default function ProctorIncidentsPage() {
  const { examId, sessionId } = useParams<{ examId: string; sessionId: string }>();
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get<Incident[]>(`/api/incidents/session/${sessionId}`);
      setIncidents(res.data);
    };

    load();
  }, [sessionId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        if (incident.sessionId !== sessionId) return;
        setIncidents((prev) => [...prev, incident]);
      });
    });

    return () => { void client.deactivate(); };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white p-6">
      <button onClick={() => router.back()} className="text-white/80 hover:text-white">← Back</button>
      <h1 className="text-2xl font-semibold mt-3">Live Incidents</h1>
      <p className="text-sm text-white/60">Exam: {examId}</p>
      <p className="text-sm text-white/60 mb-4">Session: {sessionId}</p>
      <IncidentTimeline incidents={incidents} />
    </div>
  );
}
