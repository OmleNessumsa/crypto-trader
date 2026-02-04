const COIN_CONFIG: Record<string, { icon: string; gradient: string; glow: string }> = {
  BTC: {
    icon: "₿",
    gradient: "from-orange-500 to-amber-400",
    glow: "rgba(251, 146, 60, 0.3)",
  },
  ETH: {
    icon: "Ξ",
    gradient: "from-violet-500 to-indigo-400",
    glow: "rgba(139, 92, 246, 0.3)",
  },
  SOL: {
    icon: "◎",
    gradient: "from-fuchsia-500 to-purple-400",
    glow: "rgba(217, 70, 239, 0.3)",
  },
};

export default function CoinCard({
  pair,
  price,
  weight,
  targetWeight,
}: {
  pair: string;
  price: number;
  weight: number;
  targetWeight: number;
}) {
  const coin = pair.split("-")[0];
  const config = COIN_CONFIG[coin] || {
    icon: coin[0],
    gradient: "from-slate-500 to-slate-400",
    glow: "rgba(148, 163, 184, 0.3)",
  };

  const weightPercent = (weight * 100).toFixed(1);
  const targetPercent = (targetWeight * 100).toFixed(1);
  const deviation = weight - targetWeight;
  const deviationPercent = (deviation * 100).toFixed(1);
  const isOverweight = deviation > 0.01;
  const isUnderweight = deviation < -0.01;

  return (
    <div className="glass-card p-5 group hover:border-slate-700/50 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Coin Icon */}
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg transition-transform duration-300 group-hover:scale-110`}
            style={{ boxShadow: `0 8px 24px ${config.glow}` }}
          >
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{coin}</h3>
            <p className="text-xs text-slate-500">{pair}</p>
          </div>
        </div>

        {/* Deviation Badge */}
        {(isOverweight || isUnderweight) && (
          <div
            className={`px-2 py-1 rounded-md text-xs font-medium ${
              isOverweight
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {isOverweight ? "+" : ""}{deviationPercent}%
          </div>
        )}
      </div>

      {/* Weight Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Allocation</span>
          <span className="font-mono text-slate-200">{weightPercent}%</span>
        </div>

        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${Math.min(parseFloat(targetPercent), 100)}%` }}
          />
          {/* Actual weight */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
            style={{ width: `${Math.min(parseFloat(weightPercent), 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>Target: {targetPercent}%</span>
          <span className="font-mono">
            {price > 0 ? `€${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
