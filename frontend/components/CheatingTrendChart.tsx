"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { time: string; incidents: number };

export default function CheatingTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
      <h3 className="mb-2 text-lg font-semibold text-white">Cheating Trend</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#cbd5e1" />
          <YAxis allowDecimals={false} stroke="#cbd5e1" />
          <Tooltip />
          <Line type="monotone" dataKey="incidents" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
