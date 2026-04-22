"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<Incident[]>(`/api/incidents/session/${sessionId}`);
        setIncidents(res.data);
        setError("");
      } catch (err) {
        console.error("Failed to load incidents", err);
        setError("Failed to load incidents");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [sessionId]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
  
    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/incidentDetected", (message) => {
        const incident = JSON.parse(message.body) as Incident;
        if (incident.sessionId !== sessionId) return;
  
        setIncidents((prev) => {
          const exists = prev.some((item) => item.id === incident.id);
          if (exists) return prev;
          return [...prev, incident];
        });
      });
    });
  
    return () => {
      void client.deactivate();
    };
  }, [sessionId]);

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity >= 0.9).length;
    const high = incidents.filter((i) => i.severity >= 0.6 && i.severity < 0.9).length;
    const avgSeverity =
      total > 0
        ? (incidents.reduce((sum, i) => sum + i.severity, 0) / total).toFixed(2)
        : "0.00";

    return { total, critical, high, avgSeverity };
  }, [incidents]);

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">Loading live incidents...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="glass-card accent-border p-5 md:p-6">
            <button
              onClick={() => router.back()}
              className="mb-3 text-sm text-white/60 transition hover:text-white"
            >
              ← Back
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Session Incident Monitor
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Live Incidents
            </h1>
            <p className="mt-2 text-sm text-white/55">Exam: {examId}</p>
            <p className="mt-1 break-all text-sm text-white/55">Session: {sessionId}</p>
          </section>

          <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {error}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="mb-3 text-sm text-white/60 transition hover:text-white"
              >
                ← Back
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Session Incident Monitor
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Live Incidents
              </h1>
              <p className="mt-2 text-sm text-white/55">Exam: {examId}</p>
              <p className="mt-1 break-all text-sm text-white/55">Session: {sessionId}</p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
              Real-time incident subscription enabled
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Incidents"
            value={stats.total}
            hint="All recorded violations"
            color="text-cyan-300"
          />
          <MetricCard
            title="Critical"
            value={stats.critical}
            hint="Severity ≥ 0.90"
            color="text-red-300"
          />
          <MetricCard
            title="High"
            value={stats.high}
            hint="0.60 to 0.89 severity"
            color="text-orange-300"
          />
          <MetricCard
            title="Avg Severity"
            value={stats.avgSeverity}
            hint="Average severity score"
            color="text-violet-300"
          />
        </section>

        {/* Layout */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Timeline */}
          <section className="glass-card accent-border p-5 md:p-6">
            <div className="mb-5">
              <h2 className="section-title">Incident Timeline</h2>
              <p className="section-subtitle">
                Live chronological feed of suspicious events for this session.
              </p>
            </div>

            <IncidentTimeline incidents={incidents} />
          </section>

          {/* Side Panel */}
          <div className="space-y-6">
            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Quick Actions</h3>
              <p className="section-subtitle">Navigate to related monitoring views.</p>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => router.push(`/proctor/${examId}/live/${sessionId}`)}
                  className="ai-button-primary"
                >
                  Open Live Feed
                </button>

                <button
                  onClick={() => router.push(`/proctor/${examId}`)}
                  className="ai-button-secondary"
                >
                  Back to Proctor Dashboard
                </button>
              </div>
            </section>

            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Session Details</h3>

              <div className="mt-5 space-y-3">
                <InfoTile label="Exam ID" value={examId} />
                <InfoTile label="Session ID" value={sessionId} />
                <InfoTile label="Live Events" value="STOMP /topic/incidentDetected" />
              </div>
            </section>

            <section className="glass-card accent-border p-5">
              <h3 className="section-title">Monitoring Guidance</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Review high-severity and repeated incidents first. Use replay clips when available
                to validate whether the behavior warrants suspension or force submission.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  hint,
  color,
}: {
  title: string;
  value: string | number;
  hint: string;
  color: string;
}) {
  return (
    <div className="glass-card-soft accent-border p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className={`mt-3 text-4xl font-semibold tracking-tight ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-white/55">{hint}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-white/85">{value}</p>
    </div>
  );
}