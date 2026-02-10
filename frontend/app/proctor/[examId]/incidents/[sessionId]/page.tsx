"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Incident = {
  id: string;
  type: string;
  confidence: number;
  createdAt: string;
};

const API = "http://localhost:8080";

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
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(
        `${API}/api/proctor/sessions/${sessionId}/incidents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) return;

      const data = await res.json();
      setIncidents(data);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => router.back()}>← Back</button>

      <h1 style={{ fontSize: 22, marginTop: 12 }}>
        Live Incidents
      </h1>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Exam: {examId}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Session: {sessionId}
      </div>

      {loading && <p>Loading…</p>}

      {!loading && incidents.length === 0 && (
        <p style={{ marginTop: 16 }}>No incidents detected</p>
      )}

      <div style={{ marginTop: 20 }}>
        {incidents.map(i => (
          <div
            key={i.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <strong>{i.type}</strong>
            </div>

            <div style={{ fontSize: 12 }}>
              Confidence: {(i.confidence * 100).toFixed(1)}%
            </div>

            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {new Date(i.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}