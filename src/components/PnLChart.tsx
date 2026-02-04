"use client";

export default function PnLChart({
  data,
}: {
  data: { timestamp: string; totalValueEur: number }[];
}) {
  if (data.length < 2) {
    return (
      <div className="glass-card p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Performance
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Not enough data</p>
          <p className="text-xs text-slate-600 mt-1">Chart will appear after more ticks</p>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.totalValueEur);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 600;
  const H = 180;
  const padX = 0;
  const padY = 20;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = padY + (1 - (d.totalValueEur - min) / range) * (H - padY * 2);
    return { x, y, value: d.totalValueEur };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const changePercent = first > 0 ? ((change / first) * 100).toFixed(2) : "0.00";
  const up = last >= first;

  const gradientId = `pnl-gradient-${up ? "up" : "down"}`;
  const strokeColor = up ? "#10b981" : "#f43f5e";
  const fillColor = up ? "url(#pnl-gradient-up)" : "url(#pnl-gradient-down)";

  const areaPoints = [
    `${padX},${H}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${W - padX},${H}`,
  ].join(" ");

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Performance
          </h3>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold ${
          up ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        }`}>
          {up ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          <span className="font-mono">{up ? "+" : ""}{changePercent}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-4 text-xs">
        <div>
          <span className="text-slate-500">Low</span>
          <p className="font-mono text-slate-300">€{min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <span className="text-slate-500">High</span>
          <p className="font-mono text-slate-300">€{max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <span className="text-slate-500">Change</span>
          <p className={`font-mono ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {up ? "+" : ""}€{change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnl-gradient-up" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pnl-gradient-down" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(244, 63, 94)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padX}
            y1={padY + ratio * (H - padY * 2)}
            x2={W - padX}
            y2={padY + ratio * (H - padY * 2)}
            stroke="rgb(51, 65, 85)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          />
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill={fillColor} />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* End dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={strokeColor}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}
