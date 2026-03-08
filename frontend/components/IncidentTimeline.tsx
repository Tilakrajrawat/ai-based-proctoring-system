"use client";

import { useMemo, useState } from "react";

type IncidentItem = {
  id?: string;
  timestamp?: string;
  type: string;
  confidence: number;
  severity: number;
  videoSnippetUrl?: string;
};

const iconByType: Record<string, string> = {
  LOOKING_AWAY: "👀",
  PHONE_DETECTED: "📱",
  EYES_CLOSED: "😴",
  MULTIPLE_FACES: "👥",
  SESSION_AUTO_SUSPEND: "⛔",
};

function severityColor(value: number): string {
  if (value >= 0.9) return "text-red-400 border-red-400/40 bg-red-500/10";
  if (value >= 0.6) return "text-orange-300 border-orange-300/40 bg-orange-500/10";
  if (value >= 0.3) return "text-yellow-300 border-yellow-300/40 bg-yellow-500/10";
  return "text-green-300 border-green-300/40 bg-green-500/10";
}

function formatTime(timestamp?: string) {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function IncidentTimeline({ incidents }: { incidents: IncidentItem[] }) {
  const sorted = useMemo(
    () => [...incidents].sort((a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()),
    [incidents]
  );

  const [replayUrl, setReplayUrl] = useState<string | null>(null);

  return (
    <>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5">
        <h3 className="text-white text-lg font-semibold mb-4">Incident Timeline</h3>
        <div className="space-y-3 max-h-[28rem] overflow-auto pr-2">
          {sorted.length === 0 && <div className="text-white/60 text-sm">No incidents detected yet.</div>}
          {sorted.map((incident, index) => (
            <div key={incident.id ?? `${incident.type}-${index}`} className="group relative pl-5">
              <div className="absolute left-0 top-1 h-full w-px bg-white/20" />
              <div className="absolute left-[-4px] top-2 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
              <div className={`rounded-xl border p-3 transition ${severityColor(incident.severity)}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-white/70">{formatTime(incident.timestamp)}</div>
                  {incident.videoSnippetUrl && (
                    <button
                      onClick={() => setReplayUrl(incident.videoSnippetUrl ?? null)}
                      className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white"
                    >
                      Replay
                    </button>
                  )}
                </div>
                <div className="mt-1 text-sm text-white font-medium flex items-center gap-2">
                  <span>{iconByType[incident.type] ?? "⚠️"}</span>
                  <span>{incident.type.replaceAll("_", " ")}</span>
                </div>
                <div className="mt-1 text-xs text-white/70 opacity-80 group-hover:opacity-100">
                  Confidence {(incident.confidence * 100).toFixed(1)}% • Severity {(incident.severity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {replayUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-white font-semibold">Incident Replay</h4>
              <button onClick={() => setReplayUrl(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <video controls className="w-full rounded-xl bg-black/40">
              <source src={replayUrl} />
            </video>
          </div>
        </div>
      )}
    </>
  );
}
