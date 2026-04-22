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

function severityClass(value: number): string {
  if (value >= 0.9) return "border-red-500/20 bg-red-500/10 text-red-200";
  if (value >= 0.6) return "border-orange-500/20 bg-orange-500/10 text-orange-200";
  if (value >= 0.3) return "border-yellow-500/20 bg-yellow-500/10 text-yellow-200";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
}

function severityLabel(value: number): string {
  if (value >= 0.9) return "Critical";
  if (value >= 0.6) return "High";
  if (value >= 0.3) return "Medium";
  return "Low";
}

function typeLabel(type: string) {
  return type.replaceAll("_", " ");
}

function formatTime(timestamp?: string) {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IncidentTimeline({ incidents }: { incidents: IncidentItem[] }) {
  const sorted = useMemo(
    () =>
      [...incidents].sort(
        (a, b) =>
          new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
      ),
    [incidents]
  );

  const [replayUrl, setReplayUrl] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-3 max-h-[34rem] overflow-auto pr-1">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-sm text-white/60">
            No incidents detected yet.
          </div>
        )}

        {sorted.map((incident, index) => (
          <div key={incident.id ?? `${incident.type}-${index}`} className="relative pl-5">
            <div className="absolute left-[7px] top-0 h-full w-px bg-white/10" />
            <div className="absolute left-0 top-5 h-4 w-4 rounded-full border border-cyan-400/30 bg-cyan-400/20 shadow-[0_0_18px_rgba(34,211,238,0.2)]" />

            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
                      {formatTime(incident.timestamp)}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${severityClass(
                        incident.severity
                      )}`}
                    >
                      {severityLabel(incident.severity)}
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-semibold text-white md:text-lg">
                    {typeLabel(incident.type)}
                  </h4>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Confidence
                      </p>
                      <p className="mt-1 text-sm font-medium text-white/85">
                        {(incident.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Severity Score
                      </p>
                      <p className="mt-1 text-sm font-medium text-white/85">
                        {(incident.severity * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>

                {incident.videoSnippetUrl && (
                  <button
                    onClick={() => setReplayUrl(incident.videoSnippetUrl ?? null)}
                    className="ai-button-secondary whitespace-nowrap px-4 py-2 text-sm"
                  >
                    Replay Clip
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {replayUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-card accent-border w-full max-w-4xl p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Incident Replay</h3>
                <p className="text-sm text-white/55">Review the captured video snippet</p>
              </div>

              <button
                onClick={() => setReplayUrl(null)}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-black/40">
              <video controls className="w-full bg-black">
                <source src={replayUrl} />
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
}