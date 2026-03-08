"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { useProctorWebRTC } from "../../[examId]/useProctorWebRTC";
import IncidentTimeline from "../../../../components/IncidentTimeline";
import { createStompClient } from "../../../../lib/stomp";
import { getAuthToken } from "../../../../lib/auth";

type Session = {
  id: string;
  studentId: string;
  examId: string;
  status: string;
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

export default function SessionInspectionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const sessionRes = await api.get<Session>(`/api/sessions/${sessionId}`);
      setSession(sessionRes.data);
      const incidentsRes = await api.get<Incident[]>(`/api/incidents/session/${sessionId}`);
      setIncidents(incidentsRes.data);
    };

    load();
  }, [sessionId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        if (incident.sessionId === sessionId) {
          setIncidents((prev) => [...prev, incident]);
        }
      });
      connectedClient.subscribe("/topic/sessionUpdated", (message) => {
        const update = JSON.parse(message.body) as Session;
        if (update.id === sessionId) {
          setSession((prev) => ({ ...(prev ?? update), ...update }));
        }
      });
    });

    return () => { void client.deactivate(); };
  }, [sessionId]);

  useProctorWebRTC(session?.examId ?? "", sessionId, videoRef);

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white p-4 lg:p-6">
      <button onClick={() => router.back()} className="text-white/80 hover:text-white mb-4">← Back</button>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5">
          <h2 className="text-lg font-semibold">Student Info</h2>
          <div className="text-sm text-white/70 mt-3">Student ID</div>
          <div className="font-medium">{session?.studentId ?? "-"}</div>
          <div className="text-sm text-white/70 mt-3">Risk Score</div>
          <div className="text-2xl text-orange-300 font-semibold">{session?.totalSeverity?.toFixed(1) ?? "0.0"}</div>
          <div className="text-sm text-white/70 mt-3">Session State</div>
          <div>{session?.status ?? "-"}</div>
        </div>

        <div className="xl:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5">
          <h2 className="text-lg font-semibold mb-3">Live Video Feed</h2>
          <video ref={videoRef} autoPlay playsInline controls className="w-full rounded-xl bg-black/40 min-h-[360px]" />
        </div>

        <div className="xl:col-span-3">
          <IncidentTimeline incidents={incidents} />
        </div>
      </div>
    </div>
  );
}
