import type { EvaluationMetrics, StrategyCandidate, PROMOTION_CRITERIA } from "../backtesting/types";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getPaperPnLHistory, getPaperTrades } from "../paper-trading/paper-store";
import { calculateMetrics, calculateMaxDrawdown } from "./metrics";

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

/**
 * Evaluate paper trading performance for a strategy
 */
export async function evaluatePaperPerformance(
  strategyId: string,
  initialCapital: number = 1000
): Promise<{
  score: number;
  metrics: EvaluationMetrics;
  daysTested: number;
}> {
  // Get paper trading history
  const pnlHistory = await getPaperPnLHistory(1000);
  const trades = await getPaperTrades(1000);

  // Filter by strategy ID if provided
  const relevantPnL = strategyId
    ? pnlHistory.filter((p) => p.strategyId === strategyId)
    : pnlHistory;
  const relevantTrades = strategyId
    ? trades.filter((t) => t.strategyId === strategyId)
    : trades;

  if (relevantPnL.length === 0) {
    return {
      score: 0,
      metrics: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0,
        combinedScore: 0,
      },
      daysTested: 0,
    };
  }

  // Convert PnL history to snapshots format
  const snapshots = relevantPnL.map((p) => ({
    timestamp: p.timestamp,
    balances: {},
    totalValueEur: p.totalValueEur,
    weights: {},
  }));

  // Convert trades to simulated trades format
  const simulatedTrades = relevantTrades.map((t) => ({
    timestamp: t.timestamp,
    pair: t.pair,
    side: t.side as "BUY" | "SELL",
    amountEur: t.amountEur,
    price: t.price,
    reason: t.reason,
  }));

  // Calculate metrics
  const metrics = calculateMetrics(snapshots, simulatedTrades, initialCapital);

  // Calculate days tested
  const timestamps = relevantPnL.map((p) => new Date(p.timestamp).getTime());
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);
  const daysTested = Math.ceil((newestTimestamp - oldestTimestamp) / (24 * 60 * 60 * 1000));

  return {
    score: metrics.combinedScore,
    metrics,
    daysTested,
  };
}

/**
 * Check if a strategy meets promotion criteria
 */
export function meetsPromotionCriteria(
  backtestScore: number,
  paperScore: number,
  paperDaysTested: number,
  paperMaxDrawdown: number,
  criteria: typeof PROMOTION_CRITERIA
): {
  eligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (backtestScore < criteria.minBacktestScore) {
    reasons.push(`Backtest score ${(backtestScore * 100).toFixed(1)}% < ${(criteria.minBacktestScore * 100).toFixed(1)}% minimum`);
  }

  if (paperDaysTested < criteria.minPaperDays) {
    reasons.push(`Paper days tested ${paperDaysTested} < ${criteria.minPaperDays} minimum`);
  }

  if (paperScore < criteria.minPaperScore) {
    reasons.push(`Paper score ${(paperScore * 100).toFixed(1)}% < ${(criteria.minPaperScore * 100).toFixed(1)}% minimum`);
  }

  if (paperMaxDrawdown > criteria.maxPaperDrawdown) {
    reasons.push(`Paper drawdown ${(paperMaxDrawdown * 100).toFixed(1)}% > ${(criteria.maxPaperDrawdown * 100).toFixed(1)}% maximum`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Get all strategy candidates
 */
export async function getStrategyCandidates(): Promise<StrategyCandidate[]> {
  const { data } = await getSupabase()
    .from("strategy_candidates")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    strategyParams: row.strategy_params,
    backtestScore: row.backtest_score,
    paperScore: row.paper_score,
    paperDaysTested: row.paper_days_tested,
    status: row.status,
    promotedAt: row.promoted_at,
  }));
}

/**
 * Add a new strategy candidate
 */
export async function addStrategyCandidate(
  strategyParams: Record<string, unknown>,
  backtestScore: number
): Promise<number> {
  const { data } = await getSupabase()
    .from("strategy_candidates")
    .insert({
      strategy_params: strategyParams,
      backtest_score: backtestScore,
      status: "paper_testing",
    })
    .select("id")
    .single();

  return data?.id ?? 0;
}

/**
 * Update strategy candidate with paper trading results
 */
export async function updateCandidatePaperResults(
  candidateId: number,
  paperScore: number,
  paperDaysTested: number
): Promise<void> {
  await getSupabase()
    .from("strategy_candidates")
    .update({
      paper_score: paperScore,
      paper_days_tested: paperDaysTested,
    })
    .eq("id", candidateId);
}

/**
 * Mark a strategy candidate as promoted or rejected
 */
export async function updateCandidateStatus(
  candidateId: number,
  status: "promoted" | "rejected"
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === "promoted") {
    update.promoted_at = new Date().toISOString();
  }

  await getSupabase()
    .from("strategy_candidates")
    .update(update)
    .eq("id", candidateId);
}

/**
 * Get the best eligible candidate for promotion
 */
export async function getBestEligibleCandidate(): Promise<StrategyCandidate | null> {
  const candidates = await getStrategyCandidates();

  const eligibleCandidates = candidates.filter(
    (c) =>
      c.status === "paper_testing" &&
      c.backtestScore !== null &&
      c.paperScore !== null &&
      c.paperDaysTested >= 7
  );

  if (eligibleCandidates.length === 0) return null;

  // Sort by combined score (backtest + paper)
  eligibleCandidates.sort((a, b) => {
    const scoreA = (a.backtestScore ?? 0) * 0.4 + (a.paperScore ?? 0) * 0.6;
    const scoreB = (b.backtestScore ?? 0) * 0.4 + (b.paperScore ?? 0) * 0.6;
    return scoreB - scoreA;
  });

  return eligibleCandidates[0];
}
