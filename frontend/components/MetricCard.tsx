export default function MetricCard({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className={`mt-2 text-3xl font-semibold font-mono ${accent}`}>{value}</p>
    </div>
  );
}
