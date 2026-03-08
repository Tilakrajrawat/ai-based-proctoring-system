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
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ---------------- LOAD SESSION ---------------- */

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [sessionRes, incidentsRes] = await Promise.all([
          api.get<Session>(`/api/sessions/${sessionId}`),
          api.get<Incident[]>(`/api/incidents/session/${sessionId}`)
        ]);

        if (!active) return;

        setSession(sessionRes.data);
        setIncidents(incidentsRes.data);
      } catch (err) {
        console.error("Failed to load session data", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [sessionId]);

  /* ---------------- WEBSOCKET LIVE UPDATES ---------------- */

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (msg) => {
        const incident = JSON.parse(msg.body) as Incident;

        if (incident.sessionId === sessionId) {
          setIncidents((prev) => [...prev, incident]);
        }
      });

      connectedClient.subscribe("/topic/sessionUpdated", (msg) => {
        const update = JSON.parse(msg.body) as Session;

        if (update.id === sessionId) {
          setSession((prev) => ({ ...(prev ?? update), ...update }));
        }
      });
    });

    return () => {
      void client.deactivate();
    };
  }, [sessionId]);

  /* ---------------- WEBRTC STREAM ---------------- */

  useProctorWebRTC(session?.examId ?? "", sessionId, videoRef);

  if (loading) {
    return <div className="p-6">Loading session...</div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-4">

      <button
        onClick={() => router.back()}
        className="text-sm underline"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* Student Info */}

        <div className="xl:col-span-3 border rounded p-4">
          <h2 className="font-semibold mb-3">Student Info</h2>

          <div className="text-sm text-gray-500">Student ID</div>
          <div className="font-medium mb-3">
            {session?.studentId ?? "-"}
          </div>

          <div className="text-sm text-gray-500">Risk Score</div>
          <div className="text-xl font-semibold mb-3">
            {session?.totalSeverity?.toFixed(1) ?? "0.0"}
          </div>

          <div className="text-sm text-gray-500">Session Status</div>
          <div>{session?.status ?? "-"}</div>
        </div>

        {/* Video Feed */}

        <div className="xl:col-span-6 border rounded p-4">
          <h2 className="font-semibold mb-3">Live Video Feed</h2>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            className="w-full rounded bg-black min-h-[360px]"
          />
        </div>

        {/* Incident Timeline */}

        <div className="xl:col-span-3">
          <IncidentTimeline incidents={incidents} />
        </div>

      </div>
    </div>
  );
}