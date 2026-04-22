"use client";

export default function IncidentStatsChart({ stats }: { stats: Record<string, number> }) {
  const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  const maxCount = Math.max(1, ...entries.map(([, count]) => count));

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Incident Statistics</h3>
          <p className="text-sm text-white/55">Distribution of violation categories</p>
        </div>

        <span className="badge-chip">{entries.length} types</span>
      </div>

      {entries.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-3xl border border-white/[0.06] bg-black/10 text-sm text-white/60">
          No incident stats yet.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(([type, count]) => {
            const percentage = (count / total) * 100;
            const width = (count / maxCount) * 100;

            return (
              <div key={type}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white/80">
                    {type.replaceAll("_", " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                      {count}
                    </span>
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    style={{ width: `${width}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-cyan-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}