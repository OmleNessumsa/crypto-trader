"use client";

export default function PnLChart({
  data,
}: {
  data: { timestamp: string; totalValueEur: number }[];
}) {
  if (data.length < 2) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-medium text-white/40 mb-6">Performance</h3>
        <div className="flex items-center justify-center h-32 text-white/30 text-sm">
          Not enough data yet
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.totalValueEur);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 500;
  const H = 120;
  const padY = 10;

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

  const color = isUp ? "#00ff88" : "#ff4757";

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/40">Performance</h3>
        <div className={`badge ${isUp ? 'badge-success' : 'badge-danger'}`}>
          <span className="font-mono">
            {isUp ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex gap-6 mb-4 text-xs">
        <div>
          <span className="text-white/30">Low</span>
          <p className="font-mono">€{min.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-white/30">High</span>
          <p className="font-mono">€{max.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-white/30">Change</span>
          <p className="font-mono" style={{ color }}>
            {isUp ? "+" : ""}€{change.toFixed(2)}
          </p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill="url(#chart-gradient)" />
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
          r="4"
          fill={color}
        />
      </svg>
    </div>
  );
}
