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
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Trade History</h3>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-2 pr-3">Time</th>
              <th className="pb-2 pr-3">Pair</th>
              <th className="pb-2 pr-3">Side</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2 pr-3 text-right">Price</th>
              <th className="pb-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? "bg-gray-900" : "bg-gray-800/40"}>
                <td className="whitespace-nowrap py-1.5 pr-3 text-gray-400">
                  {new Date(t.timestamp).toLocaleString()}
                </td>
                <td className="pr-3 font-medium text-gray-300">{t.pair.replace("-EUR", "")}</td>
                <td className={`pr-3 font-bold ${t.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.side}
                </td>
                <td className="pr-3 text-right font-mono text-gray-300">
                  {"\u20AC"}{t.amountEur.toFixed(2)}
                </td>
                <td className="pr-3 text-right font-mono text-gray-400">
                  {"\u20AC"}{t.price.toLocaleString()}
                </td>
                <td className="max-w-[200px] truncate text-gray-500">{t.reason}</td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-600">No trades yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
