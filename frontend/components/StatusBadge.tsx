type StatusLevel = "safe" | "warning" | "suspicious" | "critical";

const styles: Record<StatusLevel, { wrap: string; dot: string; label: string }> = {
  safe: {
    wrap: "bg-emerald-400/10 border-emerald-400/30 text-emerald-300",
    dot: "bg-emerald-400",
    label: "SAFE",
  },
  warning: {
    wrap: "bg-yellow-300/10 border-yellow-300/30 text-yellow-200",
    dot: "bg-yellow-300",
    label: "WARNING",
  },
  suspicious: {
    wrap: "bg-orange-400/10 border-orange-400/30 text-orange-300",
    dot: "bg-orange-400",
    label: "SUSPICIOUS",
  },
  critical: {
    wrap: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    dot: "bg-rose-500 animate-pulse",
    label: "CRITICAL",
  },
};

export default function StatusBadge({ status, className = "" }: { status: StatusLevel; className?: string }) {
  const style = styles[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] tracking-[0.14em] font-medium ${style.wrap} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
