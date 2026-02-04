import type { EvaluationMetrics, PortfolioSnapshot, SimulatedTrade } from "../backtesting/types";

/**
 * Calculate all evaluation metrics from backtest results
 */
export function calculateMetrics(
  snapshots: PortfolioSnapshot[],
  trades: SimulatedTrade[],
  initialCapital: number
): EvaluationMetrics {
  if (snapshots.length === 0) {
    return {
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      combinedScore: 0,
    };
  }

  const totalReturn = calculateTotalReturn(snapshots, initialCapital);
  const sharpeRatio = calculateSharpeRatio(snapshots);
  const maxDrawdown = calculateMaxDrawdown(snapshots);
  const winRate = calculateWinRate(trades);
  const totalTrades = trades.length;

  // Calculate combined score (weighted average)
  const combinedScore = calculateCombinedScore(
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate
  );

  return {
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades,
    combinedScore,
  };
}

/**
 * Calculate total return: (final - initial) / initial
 */
export function calculateTotalReturn(
  snapshots: PortfolioSnapshot[],
  initialCapital: number
): number {
  if (snapshots.length === 0) return 0;

  const finalValue = snapshots[snapshots.length - 1].totalValueEur;
  return (finalValue - initialCapital) / initialCapital;
}

/**
 * Calculate Sharpe Ratio: (average return - risk free rate) / std deviation
 * Using daily returns, assuming 4h candles (6 per day)
 * Risk-free rate assumed to be 0 for crypto
 */
export function calculateSharpeRatio(snapshots: PortfolioSnapshot[]): number {
  if (snapshots.length < 2) return 0;

  // Calculate returns between snapshots
  const returns: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prevValue = snapshots[i - 1].totalValueEur;
    const currValue = snapshots[i].totalValueEur;
    if (prevValue > 0) {
      returns.push((currValue - prevValue) / prevValue);
    }
  }

  if (returns.length === 0) return 0;

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return meanReturn > 0 ? 3 : 0; // Cap at 3 if no volatility

  // Annualize: assuming 6 snapshots per day * 365 days
  const annualizationFactor = Math.sqrt(6 * 365);

  const sharpe = (meanReturn / stdDev) * annualizationFactor;

  // Cap Sharpe ratio at reasonable bounds
  return Math.max(-3, Math.min(3, sharpe));
}

/**
 * Calculate maximum drawdown: largest peak-to-trough decline
 */
export function calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): number {
  if (snapshots.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = snapshots[0].totalValueEur;

  for (const snapshot of snapshots) {
    if (snapshot.totalValueEur > peak) {
      peak = snapshot.totalValueEur;
    }

    const drawdown = (peak - snapshot.totalValueEur) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate win rate: profitable trades / total trades
 * A trade is considered "winning" if it was part of a profitable sequence
 */
export function calculateWinRate(trades: SimulatedTrade[]): number {
  if (trades.length === 0) return 0;

  // Group trades by pair to calculate per-pair profitability
  const tradesByPair: Record<string, SimulatedTrade[]> = {};
  for (const trade of trades) {
    if (!tradesByPair[trade.pair]) {
      tradesByPair[trade.pair] = [];
    }
    tradesByPair[trade.pair].push(trade);
  }

  let profitableTrades = 0;
  let totalTrades = 0;

  // Simple approach: compare consecutive buy/sell pairs
  for (const pair of Object.keys(tradesByPair)) {
    const pairTrades = tradesByPair[pair];
    let position = 0;
    let entryPrice = 0;

    for (const trade of pairTrades) {
      totalTrades++;

      if (trade.side === "BUY") {
        if (position <= 0) {
          // New long position
          entryPrice = trade.price;
          position = trade.amountEur;
        } else {
          // Adding to position - average entry
          entryPrice = (entryPrice * position + trade.price * trade.amountEur) / (position + trade.amountEur);
          position += trade.amountEur;
        }
      } else {
        // SELL
        if (position > 0 && entryPrice > 0) {
          // Closing position - check if profitable
          if (trade.price > entryPrice) {
            profitableTrades++;
          }
        }
        position -= trade.amountEur;
        if (position <= 0) {
          entryPrice = 0;
          position = 0;
        }
      }
    }
  }

  return totalTrades > 0 ? profitableTrades / totalTrades : 0;
}

/**
 * Calculate combined score using weighted metrics
 * Weights:
 * - Total Return: 30%
 * - Sharpe Ratio: 30%
 * - Max Drawdown: 25% (inverted - lower is better)
 * - Win Rate: 15%
 */
export function calculateCombinedScore(
  totalReturn: number,
  sharpeRatio: number,
  maxDrawdown: number,
  winRate: number
): number {
  // Normalize each metric to 0-1 scale

  // Total return: cap at -50% to +100%
  const normalizedReturn = Math.max(0, Math.min(1, (totalReturn + 0.5) / 1.5));

  // Sharpe ratio: cap at -1 to +3
  const normalizedSharpe = Math.max(0, Math.min(1, (sharpeRatio + 1) / 4));

  // Max drawdown: invert (lower is better), cap at 0-50%
  const normalizedDrawdown = Math.max(0, Math.min(1, 1 - maxDrawdown * 2));

  // Win rate: already 0-1
  const normalizedWinRate = Math.max(0, Math.min(1, winRate));

  // Weighted combination
  const combinedScore =
    normalizedReturn * 0.3 +
    normalizedSharpe * 0.3 +
    normalizedDrawdown * 0.25 +
    normalizedWinRate * 0.15;

  return combinedScore;
}

/**
 * Compare two strategy results
 */
export function compareStrategies(
  metricsA: EvaluationMetrics,
  metricsB: EvaluationMetrics
): {
  winner: "A" | "B" | "tie";
  scoreDiff: number;
  comparison: Record<string, { a: number; b: number; winner: "A" | "B" | "tie" }>;
} {
  const comparison: Record<string, { a: number; b: number; winner: "A" | "B" | "tie" }> = {
    totalReturn: {
      a: metricsA.totalReturn,
      b: metricsB.totalReturn,
      winner: metricsA.totalReturn > metricsB.totalReturn ? "A" : metricsB.totalReturn > metricsA.totalReturn ? "B" : "tie",
    },
    sharpeRatio: {
      a: metricsA.sharpeRatio,
      b: metricsB.sharpeRatio,
      winner: metricsA.sharpeRatio > metricsB.sharpeRatio ? "A" : metricsB.sharpeRatio > metricsA.sharpeRatio ? "B" : "tie",
    },
    maxDrawdown: {
      a: metricsA.maxDrawdown,
      b: metricsB.maxDrawdown,
      winner: metricsA.maxDrawdown < metricsB.maxDrawdown ? "A" : metricsB.maxDrawdown < metricsA.maxDrawdown ? "B" : "tie",
    },
    winRate: {
      a: metricsA.winRate,
      b: metricsB.winRate,
      winner: metricsA.winRate > metricsB.winRate ? "A" : metricsB.winRate > metricsA.winRate ? "B" : "tie",
    },
  };

  const scoreDiff = metricsA.combinedScore - metricsB.combinedScore;
  const winner: "A" | "B" | "tie" =
    Math.abs(scoreDiff) < 0.01 ? "tie" : scoreDiff > 0 ? "A" : "B";

  return { winner, scoreDiff, comparison };
}
