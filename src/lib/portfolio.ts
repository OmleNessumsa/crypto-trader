const COIN_FOR_PAIR: Record<string, string> = {
  "BTC-EUR": "BTC",
  "ETH-EUR": "ETH",
  "SOL-EUR": "SOL",
};

export function computePortfolioValue(
  balances: Record<string, number>,
  prices: Record<string, number>
): number {
  let total = balances["EUR"] ?? 0;
  for (const [pair, price] of Object.entries(prices)) {
    const coin = COIN_FOR_PAIR[pair];
    if (coin && balances[coin]) {
      total += balances[coin] * price;
    }
  }
  return total;
}

export function computeCurrentWeights(
  balances: Record<string, number>,
  prices: Record<string, number>
): Record<string, number> {
  const totalValue = computePortfolioValue(balances, prices);
  if (totalValue <= 0) return {};

  const weights: Record<string, number> = {};
  for (const [pair, price] of Object.entries(prices)) {
    const coin = COIN_FOR_PAIR[pair];
    if (coin) {
      const coinValue = (balances[coin] ?? 0) * price;
      weights[pair] = coinValue / totalValue;
    }
  }
  return weights;
}

export interface RebalanceTrade {
  pair: string;
  side: "BUY" | "SELL";
  amountEur: number;
}

export function computeRebalanceTrades(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>,
  totalValue: number,
  prices: Record<string, number>,
  minTradeSize: number,
  maxTradePercent: number
): RebalanceTrade[] {
  const trades: RebalanceTrade[] = [];
  const maxSize = totalValue * maxTradePercent;

  for (const pair of Object.keys(targetWeights)) {
    const current = currentWeights[pair] ?? 0;
    const target = targetWeights[pair] ?? 0;
    const deltaEur = (target - current) * totalValue;

    if (Math.abs(deltaEur) < minTradeSize) continue;

    const clampedAmount = Math.min(Math.abs(deltaEur), maxSize);

    trades.push({
      pair,
      side: deltaEur > 0 ? "BUY" : "SELL",
      amountEur: clampedAmount,
    });
  }

  return trades;
}
