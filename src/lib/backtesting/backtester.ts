import { v4 as uuidv4 } from "uuid";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Candle } from "../coinbase";
import type {
  BacktestConfig,
  BacktestResult,
  StrategyParams,
  DEFAULT_STRATEGY_PARAMS,
} from "./types";
import { fetchHistoricalCandles, getTimestampsFromCandles, getRecentCandles } from "./data-fetcher";
import { TradeSimulator } from "./simulator";
import { calculateMetrics } from "../evaluation/metrics";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

const DEFAULT_PAIRS = ["BTC-EUR", "ETH-EUR", "SOL-EUR"];
const DEFAULT_INITIAL_CAPITAL = 1000;
const MIN_TRADE_SIZE_EUR = 5;

/**
 * Main backtesting engine
 * Runs a complete backtest over historical data
 */
export async function runBacktest(config: Partial<BacktestConfig> = {}): Promise<BacktestResult> {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  // Merge with defaults
  const fullConfig: BacktestConfig = {
    pairs: config.pairs ?? DEFAULT_PAIRS,
    days: config.days ?? 30,
    initialCapitalEur: config.initialCapitalEur ?? DEFAULT_INITIAL_CAPITAL,
    strategyParams: config.strategyParams ?? {
      maxTradePercent: 0.2,
      stopLossPercent: 0.05,
      cooldownMinutes: 30,
      rsiOversoldThreshold: 30,
      rsiOverboughtThreshold: 70,
      baseWeights: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
    },
    granularity: config.granularity ?? "FOUR_HOUR",
  };

  // Record backtest start
  await recordBacktestStart(runId, startedAt, fullConfig.strategyParams);

  try {
    // 1. Fetch historical candles for all pairs
    const candlesMap = await fetchHistoricalCandles(
      fullConfig.pairs,
      fullConfig.days,
      fullConfig.granularity
    );

    // 2. Get all unique timestamps in chronological order
    const timestamps = getTimestampsFromCandles(candlesMap);

    if (timestamps.length === 0) {
      throw new Error("No historical data available for backtest");
    }

    // 3. Initialize simulator
    const simulator = new TradeSimulator(fullConfig.initialCapitalEur, {
      pairs: fullConfig.pairs,
      strategyParams: fullConfig.strategyParams,
      minTradeSizeEur: MIN_TRADE_SIZE_EUR,
    });

    // 4. Loop through timestamps chronologically
    for (const timestamp of timestamps) {
      // Get prices at this timestamp
      const prices: Record<string, number> = {};
      const recentCandlesMap: Record<string, Candle[]> = {};

      for (const pair of fullConfig.pairs) {
        const candles = candlesMap[pair] ?? [];
        const recentCandles = getRecentCandles(candles, timestamp, 24);

        if (recentCandles.length > 0) {
          prices[pair] = parseFloat(recentCandles[0].close);
          recentCandlesMap[pair] = recentCandles;
        }
      }

      // Skip if we don't have prices for all pairs
      if (Object.keys(prices).length !== fullConfig.pairs.length) {
        continue;
      }

      // Process this candle
      simulator.processCandle(timestamp, prices, recentCandlesMap);
    }

    // 5. Get final results
    const trades = simulator.getTrades();
    const snapshots = simulator.getSnapshots();

    // Get final prices for value calculation
    const lastTimestamp = timestamps[timestamps.length - 1];
    const finalPrices: Record<string, number> = {};
    for (const pair of fullConfig.pairs) {
      const candles = candlesMap[pair] ?? [];
      const recentCandles = getRecentCandles(candles, lastTimestamp, 1);
      if (recentCandles.length > 0) {
        finalPrices[pair] = parseFloat(recentCandles[0].close);
      }
    }

    // 6. Calculate evaluation metrics
    const metrics = calculateMetrics(
      snapshots,
      trades,
      fullConfig.initialCapitalEur
    );

    const completedAt = new Date().toISOString();

    const result: BacktestResult = {
      runId,
      startedAt,
      completedAt,
      strategyParams: fullConfig.strategyParams,
      trades,
      snapshots,
      metrics,
    };

    // Record backtest completion
    await recordBacktestComplete(runId, completedAt, result);

    return result;
  } catch (error) {
    // Record backtest failure
    await recordBacktestFailed(runId, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Run multiple backtests with different parameters
 */
export async function runMultipleBacktests(
  paramsList: StrategyParams[],
  baseConfig: Partial<BacktestConfig> = {}
): Promise<BacktestResult[]> {
  const results: BacktestResult[] = [];

  for (const params of paramsList) {
    const result = await runBacktest({
      ...baseConfig,
      strategyParams: params,
    });
    results.push(result);

    // Small delay between backtests
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}

/**
 * Record backtest start in database
 */
async function recordBacktestStart(
  runId: string,
  startedAt: string,
  strategyParams: StrategyParams
): Promise<void> {
  await getSupabase().from("backtest_runs").insert({
    run_id: runId,
    started_at: startedAt,
    strategy_params: strategyParams,
    status: "running",
  });
}

/**
 * Record backtest completion
 */
async function recordBacktestComplete(
  runId: string,
  completedAt: string,
  result: BacktestResult
): Promise<void> {
  await getSupabase()
    .from("backtest_runs")
    .update({
      completed_at: completedAt,
      results: {
        metrics: result.metrics,
        tradeCount: result.trades.length,
        snapshotCount: result.snapshots.length,
      },
      status: "completed",
    })
    .eq("run_id", runId);
}

/**
 * Record backtest failure
 */
async function recordBacktestFailed(runId: string, error: string): Promise<void> {
  await getSupabase()
    .from("backtest_runs")
    .update({
      completed_at: new Date().toISOString(),
      results: { error },
      status: "failed",
    })
    .eq("run_id", runId);
}

/**
 * Get recent backtest runs
 */
export async function getBacktestRuns(limit = 10): Promise<
  {
    runId: string;
    startedAt: string;
    completedAt: string | null;
    strategyParams: StrategyParams;
    results: unknown;
    status: string;
  }[]
> {
  const { data } = await getSupabase()
    .from("backtest_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    runId: row.run_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    strategyParams: row.strategy_params,
    results: row.results,
    status: row.status,
  }));
}

/**
 * Get the best performing backtest from recent runs
 */
export async function getBestBacktest(): Promise<{
  runId: string;
  strategyParams: StrategyParams;
  score: number;
} | null> {
  const { data } = await getSupabase()
    .from("backtest_runs")
    .select("*")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return null;

  let best: { runId: string; strategyParams: StrategyParams; score: number } | null = null;

  for (const row of data) {
    const score = row.results?.metrics?.combinedScore ?? 0;
    if (!best || score > best.score) {
      best = {
        runId: row.run_id,
        strategyParams: row.strategy_params,
        score,
      };
    }
  }

  return best;
}
