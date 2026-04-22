"use client";

type Point = { time: string; count: number };

export default function CheatingTrendChart({ points }: { points: Point[] }) {
  const data = points.slice(-20);
  const maxY = Math.max(1, ...data.map((p) => p.count));

  const path = data
    .map((point, index) => {
      const x = data.length <= 1 ? 6 : 6 + (index / (data.length - 1)) * 88;
      const y = 88 - (point.count / maxY) * 72;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Cheating Trend</h3>
          <p className="text-sm text-white/55">Recent incident frequency over time</p>
        </div>

        <span className="badge-chip">{data.length} points</span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-3xl border border-white/[0.06] bg-black/10 text-sm text-white/60">
          No trend data yet.
        </div>
      ) : (
        <div className="rounded-3xl border border-white/[0.06] bg-black/10 p-3">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-72 w-full">
            {/* Grid lines */}
            {[20, 40, 60, 80].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
            ))}

            {/* Line */}
            <path
              d={path}
              fill="none"
              stroke="rgba(34,211,238,0.95)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {data.map((point, index) => {
              const x = data.length <= 1 ? 6 : 6 + (index / (data.length - 1)) * 88;
              const y = 88 - (point.count / maxY) * 72;

              return (
                <circle
                  key={`${point.time}-${index}`}
                  cx={x}
                  cy={y}
                  r="1.6"
                  fill="rgba(34,211,238,1)"
                />
              );
            })}
          </svg>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50 md:grid-cols-4">
            {data.slice(-4).map((point, idx) => (
              <div
                key={`${point.time}-${idx}`}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div>{point.time}</div>
                <div className="mt-1 font-medium text-white/80">{point.count} incidents</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}