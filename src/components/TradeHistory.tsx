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
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Trade History
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{trades.length} trades</span>
      </div>

      {/* Table */}
      <div className="max-h-80 overflow-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">No trades yet</p>
            <p className="text-xs text-slate-600 mt-1">Trades will appear here once executed</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#0f1318] text-xs uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3 pr-4 font-medium">Time</th>
                <th className="pb-3 pr-4 font-medium">Asset</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                <th className="pb-3 pr-4 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {trades.map((t) => (
                <tr key={t.id} className="table-row-hover">
                  <td className="py-3 pr-4">
                    <span className="font-mono text-xs text-slate-400">
                      {formatTime(t.timestamp)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-slate-200">
                      {t.pair.replace("-EUR", "")}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        t.side === "BUY"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {t.side === "BUY" ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                      {t.side}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-mono text-slate-200">
                      €{t.amountEur.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-mono text-slate-400">
                      €{t.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
