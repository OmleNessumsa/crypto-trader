import type { Candle } from "../coinbase";

// Strategy parameters that can be optimized
export interface StrategyParams {
  maxTradePercent: number; // 0.10 - 0.30
  stopLossPercent: number; // 0.03 - 0.10
  cooldownMinutes: number; // 15 - 60
  rsiOversoldThreshold: number; // 25 - 35
  rsiOverboughtThreshold: number; // 65 - 75
  baseWeights: Record<string, number>;
}

// Configuration for running a backtest
export interface BacktestConfig {
  pairs: string[];
  days: number;
  initialCapitalEur: number;
  strategyParams: StrategyParams;
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY";
}

// Single simulated trade
export interface SimulatedTrade {
  timestamp: string;
  pair: string;
  side: "BUY" | "SELL";
  amountEur: number;
  price: number;
  reason: string;
}

// Portfolio snapshot at a point in time
export interface PortfolioSnapshot {
  timestamp: string;
  balances: Record<string, number>;
  totalValueEur: number;
  weights: Record<string, number>;
}

// Result from a backtest run
export interface BacktestResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  strategyParams: StrategyParams;
  trades: SimulatedTrade[];
  snapshots: PortfolioSnapshot[];
  metrics: EvaluationMetrics;
}

// Metrics used to evaluate strategy performance
export interface EvaluationMetrics {
  totalReturn: number; // (final - initial) / initial
  sharpeRatio: number; // Risk-adjusted return
  maxDrawdown: number; // Largest peak-to-trough decline
  winRate: number; // Winning trades / total trades
  totalTrades: number;
  combinedScore: number; // Weighted score of all metrics
}

// Cached candle data
export interface CachedCandles {
  pair: string;
  granularity: string;
  startTime: string;
  candles: Candle[];
  fetchedAt: string;
}

// Strategy candidate for promotion
export interface StrategyCandidate {
  id: number;
  createdAt: string;
  strategyParams: StrategyParams;
  backtestScore: number | null;
  paperScore: number | null;
  paperDaysTested: number;
  status: "paper_testing" | "promoted" | "rejected";
  promotedAt: string | null;
}

// Backtest run record
export interface BacktestRun {
  id: number;
  runId: string;
  startedAt: string;
  completedAt: string | null;
  strategyParams: StrategyParams;
  results: BacktestResult | null;
  status: "running" | "completed" | "failed";
}

// Default strategy parameters
export const DEFAULT_STRATEGY_PARAMS: StrategyParams = {
  maxTradePercent: 0.2,
  stopLossPercent: 0.05,
  cooldownMinutes: 30,
  rsiOversoldThreshold: 30,
  rsiOverboughtThreshold: 70,
  baseWeights: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
};

// Promotion criteria
export const PROMOTION_CRITERIA = {
  minBacktestScore: 0.6, // 60%+ on backtest
  minPaperDays: 7, // Minimum 7 days paper trading
  minPaperScore: 0.55, // Paper performance score
  maxPaperDrawdown: 0.08, // Max 8% drawdown
};

// Grid search parameter ranges
export const PARAMETER_RANGES = {
  maxTradePercent: { min: 0.1, max: 0.3, step: 0.05 },
  stopLossPercent: { min: 0.03, max: 0.1, step: 0.01 },
  cooldownMinutes: { min: 15, max: 60, step: 15 },
  rsiOversoldThreshold: { min: 25, max: 35, step: 5 },
  rsiOverboughtThreshold: { min: 65, max: 75, step: 5 },
};

// Base weight variations for grid search
export const BASE_WEIGHT_VARIATIONS: Record<string, Record<string, number>>[] = [
  { equal: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 } },
  { btcHeavy: { "BTC-EUR": 0.5, "ETH-EUR": 0.3, "SOL-EUR": 0.2 } },
  { ethHeavy: { "BTC-EUR": 0.3, "ETH-EUR": 0.5, "SOL-EUR": 0.2 } },
];
