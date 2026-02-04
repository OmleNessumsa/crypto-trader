export default function TradeHistory({
  trades,
}: {
  trades: {
    id: string;
    timestamp: string;
    pair: string;
    side: "BUY" | "SELL";
    amountEur: number;
    price: number;
    reason: string;
  }[];
}) {
  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-white/40">Trade History</h3>
        <span className="text-xs text-white/30 font-mono">{trades.length} trades</span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          No trades executed yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/30 text-xs">
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Side</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trades.slice(0, 10).map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="py-3 text-white/50 font-mono text-xs">
                    {formatTime(t.timestamp)}
                  </td>
                  <td className="py-3 font-medium">
                    {t.pair.split("-")[0]}
                  </td>
                  <td className="py-3">
                    <span
                      className={`badge text-xs ${
                        t.side === "BUY" ? "badge-success" : "badge-danger"
                      }`}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono">
                    €{t.amountEur.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono text-white/50">
                    €{t.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
