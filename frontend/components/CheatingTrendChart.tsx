"use client";

type Point = { time: string; count: number };

export default function CheatingTrendChart({ points }: { points: Point[] }) {
  const data = points.slice(-20);
  const maxY = Math.max(1, ...data.map((p) => p.count));
  const path = data
    .map((point, index) => {
      const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
      const y = 100 - (point.count / maxY) * 100;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 h-80">
      <h3 className="text-white text-lg font-semibold mb-4">Cheating Trend</h3>
      <div className="h-[85%] w-full bg-black/20 rounded-xl p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d={path} fill="none" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}
