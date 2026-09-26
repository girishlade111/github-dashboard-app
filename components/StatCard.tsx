import { formatNumber } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number | null;
  delta: number | null; // vs previous sync; null = no basis
  spark?: number[]; // tiny sparkline series; omitted when empty
}

function deltaClass(delta: number | null): string {
  if (delta == null || delta === 0) return "text-muted";
  return delta > 0 ? "text-primary" : "text-accent-teal";
}

function Sparkline({ data }: { data: number[] }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="mt-3">
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
    </svg>
  );
}

export default function StatCard({ label, value, delta, spark }: StatCardProps) {
  const deltaText =
    delta == null ? "—" : delta === 0 ? "—" : `${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta))}`;
  return (
    <div className="rounded-xl bg-surface-card p-6">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-2 font-display text-5xl font-normal tracking-[-0.02em] text-ink">
        {formatNumber(value)}
      </p>
      <p className={`mt-2 font-mono text-xs ${deltaClass(delta)}`}>
        {deltaText} <span className="text-muted-soft">vs last sync</span>
      </p>
      {spark && spark.length > 1 && <Sparkline data={spark} />}
    </div>
  );
}
