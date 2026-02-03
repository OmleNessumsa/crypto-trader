const COLORS: Record<string, string> = {
  "BTC-EUR": "bg-orange-500",
  "ETH-EUR": "bg-blue-500",
  "SOL-EUR": "bg-purple-500",
};

const LABELS: Record<string, string> = {
  "BTC-EUR": "BTC",
  "ETH-EUR": "ETH",
  "SOL-EUR": "SOL",
};

export default function PortfolioChart({ weights }: { weights: Record<string, number> }) {
  const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Allocation</h3>
      <div className="space-y-3">
        {entries.map(([pair, w]) => (
          <div key={pair}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-300">{LABELS[pair] ?? pair}</span>
              <span className="font-mono text-gray-400">{(w * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full ${COLORS[pair] ?? "bg-gray-500"}`}
                style={{ width: `${Math.min(w * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
