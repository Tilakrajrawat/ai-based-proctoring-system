"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProctorSessionPage() {
  const { sessionId } = useParams();
  const [incidents, setIncidents] = useState<{ id: string; type: string; confidence: number }[]>([]);
  const [status, setStatus] = useState<string>("");

  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetch(`http://localhost:8080/incidents/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(setIncidents);

      fetch(`http://localhost:8080/proctor/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setStatus(data.status));
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, token]);

  const resume = () => {
    fetch(`http://localhost:8080/proctor/sessions/${sessionId}/resume`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const end = () => {
    fetch(`http://localhost:8080/proctor/sessions/${sessionId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Proctor Session</h2>
      <p>Status: {status}</p>

      <button onClick={resume}>Resume</button>
      <button onClick={end} style={{ marginLeft: 10 }}>End</button>

      <h3>Incidents</h3>
      {incidents.map(i => (
        <div key={i.id} style={{ borderBottom: "1px solid #ccc" }}>
          <p>{i.type} — confidence {i.confidence}</p>
        </div>
      ))}
    </div>
  );
}
