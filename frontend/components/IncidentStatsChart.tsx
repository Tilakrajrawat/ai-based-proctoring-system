"use client";

const COLORS = ["#22c55e", "#facc15", "#fb923c", "#ef4444", "#a855f7", "#38bdf8"];

export default function IncidentStatsChart({ stats }: { stats: Record<string, number> }) {
  const entries = Object.entries(stats);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 h-80">
      <h3 className="text-white text-lg font-semibold mb-4">Incident Statistics</h3>
      <div className="space-y-3 overflow-auto max-h-[85%]">
        {entries.length === 0 && <div className="text-white/60 text-sm">No incident stats yet.</div>}
        {entries.map(([type, count], index) => {
          const percentage = (count / total) * 100;
          return (
            <div key={type}>
              <div className="flex justify-between text-sm text-white/80">
                <span>{type.replaceAll("_", " ")}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-1 overflow-hidden">
                <div style={{ width: `${percentage}%`, background: COLORS[index % COLORS.length] }} className="h-full rounded-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
