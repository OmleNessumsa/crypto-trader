const COINS: Record<string, { symbol: string; color: string; icon: string }> = {
  BTC: { symbol: "BTC", color: "#f7931a", icon: "₿" },
  ETH: { symbol: "ETH", color: "#627eea", icon: "Ξ" },
  SOL: { symbol: "SOL", color: "#9945ff", icon: "◎" },
};

export default function CoinCard({
  pair,
  balance,
  weight,
  targetWeight,
}: {
  pair: string;
  balance: number;
  weight: number;
  targetWeight: number;
}) {
  const coin = pair.split("-")[0];
  const config = COINS[coin] || { symbol: coin, color: "#888", icon: coin[0] };

  const weightPercent = (weight * 100).toFixed(1);
  const targetPercent = (targetWeight * 100).toFixed(1);
  const deviation = ((weight - targetWeight) * 100).toFixed(1);
  const isOver = weight > targetWeight + 0.01;
  const isUnder = weight < targetWeight - 0.01;

  return (
    <div className="card p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}99)` }}
          >
            {config.icon}
          </div>
          <div>
            <p className="font-semibold">{config.symbol}</p>
            <p className="text-xs text-white/40">{pair}</p>
          </div>
        </div>
        {(isOver || isUnder) && (
          <span className={`badge text-xs ${isOver ? 'badge-success' : 'badge-danger'}`}>
            {isOver ? '+' : ''}{deviation}%
          </span>
        )}
      </div>

      {/* Balance */}
      <div className="mb-4">
        <p className="text-2xl font-bold font-mono">
          {balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
        </p>
        <p className="text-xs text-white/40">{config.symbol} balance</p>
      </div>

      {/* Weight bar */}
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white/40">Allocation</span>
          <span className="font-mono">{weightPercent}%</span>
        </div>
        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(parseFloat(weightPercent), 100)}%`,
              background: config.color,
            }}
          />
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/50"
            style={{ left: `${Math.min(parseFloat(targetPercent), 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/30 mt-1">Target: {targetPercent}%</p>
      </div>
    </div>
  );
}
