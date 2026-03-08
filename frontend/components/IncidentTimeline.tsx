"use client";

import { useMemo, useState } from "react";

type TimelineIncident = {
  id: string;
  timestamp?: string;
  createdAt?: string;
  type?: string;
  incidentType?: string;
  confidence: number;
  severity: number;
  videoSnippetUrl?: string;
};

function severityColor(severity: number) {
  if (severity >= 0.9) return "bg-red-500";
  if (severity >= 0.6) return "bg-orange-400";
  if (severity >= 0.3) return "bg-yellow-300";
  return "bg-green-400";
}

function formatType(value?: string) {
  return (value ?? "UNKNOWN").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IncidentTimeline({ incidents }: { incidents: TimelineIncident[] }) {
  const [selected, setSelected] = useState<TimelineIncident | null>(null);

  const sorted = useMemo(
    () => [...incidents].sort((a, b) => new Date(a.timestamp ?? a.createdAt ?? 0).getTime() - new Date(b.timestamp ?? b.createdAt ?? 0).getTime()),
    [incidents]
  );

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">Incident Timeline</h3>
      <div className="space-y-3">
        {sorted.map((incident) => {
          const time = new Date(incident.timestamp ?? incident.createdAt ?? "1970-01-01T00:00:00Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const type = incident.type ?? incident.incidentType;
          return (
            <div key={incident.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${severityColor(incident.severity)}`} />
                <div className="text-sm text-white">
                  <div>{time} — {formatType(type)}</div>
                  <div className="text-xs text-slate-300">Confidence {(incident.confidence * 100).toFixed(0)}% • Severity {incident.severity.toFixed(2)}</div>
                </div>
              </div>
              {incident.videoSnippetUrl && (
                <button className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/20" onClick={() => setSelected(incident)}>
                  Replay
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-slate-900/95 p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between text-white">
              <h4 className="font-semibold">Incident Replay</h4>
              <button className="rounded border border-white/20 px-2 py-1 text-xs" onClick={() => setSelected(null)}>Close</button>
            </div>
            <video controls className="w-full rounded-lg" src={selected.videoSnippetUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
