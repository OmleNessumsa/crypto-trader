const PAIR_COLORS: Record<string, string> = {
  "BTC-EUR": "bg-orange-500",
  "ETH-EUR": "bg-blue-500",
  "SOL-EUR": "bg-purple-500",
};

export default function CoinCard({
  pair,
  price,
  weight,
  targetWeight,
  rsi,
  momentum,
}: {
  pair: string;
  price: number;
  weight: number;
  targetWeight: number;
  rsi?: number;
  momentum?: number;
}) {
  const coin = pair.replace("-EUR", "");
  const barColor = PAIR_COLORS[pair] ?? "bg-gray-500";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-gray-100">{coin}</h3>
        <span className="font-mono text-sm text-gray-300">
          {"\u20AC"}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="mb-1 text-xs text-gray-500">Current {(weight * 100).toFixed(1)}%</div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(weight * 100, 100)}%` }} />
      </div>

      <div className="mb-1 text-xs text-gray-500">Target {(targetWeight * 100).toFixed(1)}%</div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${barColor} opacity-40`} style={{ width: `${Math.min(targetWeight * 100, 100)}%` }} />
      </div>

      {(rsi !== undefined || momentum !== undefined) && (
        <div className="flex gap-3 text-xs text-gray-400">
          {rsi !== undefined && <span>RSI: <span className={rsi > 70 ? "text-red-400" : rsi < 30 ? "text-emerald-400" : "text-gray-300"}>{rsi.toFixed(0)}</span></span>}
          {momentum !== undefined && <span>Mom: <span className={momentum > 0 ? "text-emerald-400" : "text-red-400"}>{momentum > 0 ? "+" : ""}{momentum.toFixed(2)}</span></span>}
        </div>
      )}
    </div>
  );
}
