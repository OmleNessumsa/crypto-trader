"use client";

export default function PnLChart({
  data,
}: {
  data: { timestamp: string; totalValueEur: number }[];
}) {
  if (data.length < 2) {
    return (
      <div className="card p-6 sm:p-8">
        <h3 className="label mb-6">Performance</h3>
        <div className="flex items-center justify-center h-24" style={{ color: "var(--text-muted)" }}>
          <span className="text-sm">Not enough data yet</span>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.totalValueEur);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 400;
  const H = 100;
  const padY = 8;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = padY + (1 - (d.totalValueEur - min) / range) * (H - padY * 2);
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [`0,${H}`, ...points.map((p) => `${p.x},${p.y}`), `${W},${H}`].join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const changePercent = first > 0 ? (change / first) * 100 : 0;
  const isUp = change >= 0;

  const color = isUp ? "var(--accent-emerald)" : "var(--accent-red)";
  const gradientId = isUp ? "chart-grad-up" : "chart-grad-down";

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between mb-5">
        <h3 className="label">Performance</h3>
        <span
          className={`badge ${isUp ? "badge-emerald" : "badge-red"}`}
        >
          <span className="font-mono">
            {isUp ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        </span>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 mb-5 text-xs">
        <div>
          <span style={{ color: "var(--text-muted)" }}>Low</span>
          <p className="font-mono mt-0.5">€{min.toFixed(2)}</p>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>High</span>
          <p className="font-mono mt-0.5">€{max.toFixed(2)}</p>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Change</span>
          <p className="font-mono mt-0.5" style={{ color }}>
            {isUp ? "+" : ""}€{change.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={color}
        />
      </svg>
    </div>
  );
}
