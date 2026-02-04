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
    <div className="card p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="label">Trade History</h3>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {trades.length} trades
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          <p className="text-sm">No trades executed yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 sm:-mx-8 px-6 sm:px-8">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ color: "var(--text-muted)" }}>
                <th className="pb-3 text-left text-xs font-medium">Time</th>
                <th className="pb-3 text-left text-xs font-medium">Asset</th>
                <th className="pb-3 text-left text-xs font-medium">Side</th>
                <th className="pb-3 text-right text-xs font-medium">Amount</th>
                <th className="pb-3 text-right text-xs font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 10).map((t) => (
                <tr key={t.id} className="table-row border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <td className="py-3 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {formatTime(t.timestamp)}
                  </td>
                  <td className="py-3 font-medium">
                    {t.pair.split("-")[0]}
                  </td>
                  <td className="py-3">
                    <span className={`badge ${t.side === "BUY" ? "badge-emerald" : "badge-red"}`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono">
                    €{t.amountEur.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono" style={{ color: "var(--text-tertiary)" }}>
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
