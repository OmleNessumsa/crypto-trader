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
  const config = COINS[coin] || { symbol: coin, color: "#6b7280", icon: coin[0] };

  const weightPercent = (weight * 100).toFixed(1);
  const targetPercent = (targetWeight * 100).toFixed(1);
  const deviation = ((weight - targetWeight) * 100).toFixed(1);
  const isOver = weight > targetWeight + 0.01;
  const isUnder = weight < targetWeight - 0.01;

  return (
    <div className="card p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold"
            style={{
              background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
              color: "#fff",
            }}
          >
            {config.icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{config.symbol}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{pair}</p>
          </div>
        </div>
        {(isOver || isUnder) && (
          <span className={`badge text-xs ${isOver ? "badge-emerald" : "badge-red"}`}>
            {isOver ? "+" : ""}{deviation}%
          </span>
        )}
      </div>

      {/* Balance */}
      <div className="mb-6">
        <p className="font-mono text-xl sm:text-2xl font-semibold">
          {balance.toLocaleString(undefined, {
            minimumFractionDigits: balance < 1 ? 6 : 4,
            maximumFractionDigits: balance < 1 ? 8 : 6,
          })}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {config.symbol} balance
        </p>
      </div>

      {/* Allocation bar */}
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: "var(--text-tertiary)" }}>Allocation</span>
          <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{weightPercent}%</span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div
            className="absolute h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(parseFloat(weightPercent), 100)}%`,
              background: config.color,
            }}
          />
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: `${Math.min(parseFloat(targetPercent), 100)}%`,
              background: "var(--text-tertiary)",
            }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
          Target: {targetPercent}%
        </p>
      </div>
    </div>
  );
}
