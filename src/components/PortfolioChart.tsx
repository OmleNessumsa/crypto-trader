"use client";

const COIN_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  "BTC-EUR": {
    label: "Bitcoin",
    color: "#f97316",
    gradient: "from-orange-500 to-amber-400",
  },
  "ETH-EUR": {
    label: "Ethereum",
    color: "#8b5cf6",
    gradient: "from-violet-500 to-indigo-400",
  },
  "SOL-EUR": {
    label: "Solana",
    color: "#d946ef",
    gradient: "from-fuchsia-500 to-purple-400",
  },
};

export default function PortfolioChart({ weights }: { weights: Record<string, number> }) {
  const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);

  // Calculate pie segments
  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = entries.map(([pair, weight]) => {
    const percent = total > 0 ? weight / total : 0;
    const offset = accumulatedPercent * circumference;
    const length = percent * circumference;
    accumulatedPercent += percent;

    const config = COIN_CONFIG[pair] || { label: pair, color: "#64748b", gradient: "from-slate-500 to-slate-400" };

    return {
      pair,
      percent,
      offset,
      length,
      config,
    };
  });

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Allocation
        </h3>
      </div>

      <div className="flex items-center gap-8">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgb(30, 41, 59)"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {segments.map((seg, i) => (
              <circle
                key={seg.pair}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.config.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                className="transition-all duration-500"
                style={{
                  filter: `drop-shadow(0 0 8px ${seg.config.color}40)`,
                }}
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-100">{entries.length}</span>
            <span className="text-xs text-slate-500">Assets</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {segments.map((seg) => (
            <div key={seg.pair} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: seg.config.color,
                  boxShadow: `0 0 8px ${seg.config.color}60`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-slate-200 truncate">
                    {seg.config.label}
                  </span>
                  <span className="font-mono text-sm text-slate-400">
                    {(seg.percent * 100).toFixed(1)}%
                  </span>
                </div>
                {/* Mini bar */}
                <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${seg.percent * 100}%`,
                      backgroundColor: seg.config.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-4">
              No allocations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
