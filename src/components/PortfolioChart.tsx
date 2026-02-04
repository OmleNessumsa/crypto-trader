"use client";

const COLORS: Record<string, string> = {
  "BTC-EUR": "#f7931a",
  "ETH-EUR": "#627eea",
  "SOL-EUR": "#9945ff",
};

export default function PortfolioChart({ weights }: { weights: Record<string, number> }) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0) || 1;

  // SVG donut chart
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = entries.map(([pair, weight]) => {
    const percent = weight / total;
    const length = percent * circumference;
    const segment = { pair, percent, offset, length, color: COLORS[pair] || "#888" };
    offset += length;
    return segment;
  });

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-white/40 mb-6">Portfolio Allocation</h3>

      <div className="flex items-center gap-8">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            {segments.map((seg) => (
              <circle
                key={seg.pair}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${circumference}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{entries.length}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {entries.length === 0 ? (
            <p className="text-white/30 text-sm">No allocations</p>
          ) : (
            entries.map(([pair, weight]) => {
              const coin = pair.split("-")[0];
              return (
                <div key={pair} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: COLORS[pair] || "#888" }}
                  />
                  <span className="flex-1 text-sm">{coin}</span>
                  <span className="font-mono text-sm text-white/60">
                    {(weight * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
