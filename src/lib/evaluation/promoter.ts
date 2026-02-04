import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { StrategyParams, StrategyCandidate, PROMOTION_CRITERIA } from "../backtesting/types";
import { getConfig, setConfig, type TradingConfig } from "../store";
import {
  evaluatePaperPerformance,
  meetsPromotionCriteria,
  getStrategyCandidates,
  updateCandidateStatus,
  updateCandidatePaperResults,
  getBestEligibleCandidate,
} from "./evaluator";

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
 * Default promotion criteria
 */
const DEFAULT_PROMOTION_CRITERIA = {
  minBacktestScore: 0.6, // 60%+ on backtest
  minPaperDays: 7, // Minimum 7 days paper trading
  minPaperScore: 0.55, // Paper performance score
  maxPaperDrawdown: 0.08, // Max 8% drawdown
};

export interface PromotionResult {
  promoted: boolean;
  candidateId?: number;
  strategyParams?: StrategyParams;
  reason: string;
  backtestScore?: number;
  paperScore?: number;
  paperDaysTested?: number;
}

/**
 * Check and promote the best eligible strategy to live trading
 */
export async function checkAndPromote(
  criteria: typeof DEFAULT_PROMOTION_CRITERIA = DEFAULT_PROMOTION_CRITERIA
): Promise<PromotionResult> {
  // Get all candidates
  const candidates = await getStrategyCandidates();

  // Filter to paper_testing candidates with enough data
  const eligibleCandidates = candidates.filter(
    (c) => c.status === "paper_testing" && c.backtestScore !== null
  );

  if (eligibleCandidates.length === 0) {
    return {
      promoted: false,
      reason: "No strategy candidates in paper testing phase",
    };
  }

  // Evaluate each candidate
  for (const candidate of eligibleCandidates) {
    // Get paper trading performance
    const paperPerformance = await evaluatePaperPerformance(
      String(candidate.id),
      1000
    );

    // Update candidate with paper results
    await updateCandidatePaperResults(
      candidate.id,
      paperPerformance.score,
      paperPerformance.daysTested
    );

    // Check if meets criteria
    const eligibility = meetsPromotionCriteria(
      candidate.backtestScore ?? 0,
      paperPerformance.score,
      paperPerformance.daysTested,
      paperPerformance.metrics.maxDrawdown,
      criteria
    );

    if (eligibility.eligible) {
      // Promote this strategy
      await promoteStrategy(candidate);

      return {
        promoted: true,
        candidateId: candidate.id,
        strategyParams: candidate.strategyParams,
        reason: "Strategy met all promotion criteria",
        backtestScore: candidate.backtestScore ?? undefined,
        paperScore: paperPerformance.score,
        paperDaysTested: paperPerformance.daysTested,
      };
    }
  }

  // Find the best candidate even if not fully eligible
  const best = await getBestEligibleCandidate();
  if (best) {
    const paperPerformance = await evaluatePaperPerformance(String(best.id), 1000);
    const eligibility = meetsPromotionCriteria(
      best.backtestScore ?? 0,
      paperPerformance.score,
      paperPerformance.daysTested,
      paperPerformance.metrics.maxDrawdown,
      criteria
    );

    return {
      promoted: false,
      candidateId: best.id,
      strategyParams: best.strategyParams,
      reason: `Best candidate not yet eligible: ${eligibility.reasons.join("; ")}`,
      backtestScore: best.backtestScore ?? undefined,
      paperScore: paperPerformance.score,
      paperDaysTested: paperPerformance.daysTested,
    };
  }

  return {
    promoted: false,
    reason: "No eligible candidates found",
  };
}

/**
 * Promote a strategy candidate to live trading
 */
async function promoteStrategy(candidate: StrategyCandidate): Promise<void> {
  // Get current live config
  const currentConfig = await getConfig();

  // Update config with promoted strategy parameters
  const updatedConfig: TradingConfig = {
    ...currentConfig,
    maxTradePercent: candidate.strategyParams.maxTradePercent,
    stopLossPercent: candidate.strategyParams.stopLossPercent,
    cooldownMinutes: candidate.strategyParams.cooldownMinutes,
    baseWeights: candidate.strategyParams.baseWeights,
  };

  // Save new config
  await setConfig(updatedConfig);

  // Mark candidate as promoted
  await updateCandidateStatus(candidate.id, "promoted");

  // Log promotion
  console.log(
    `Strategy ${candidate.id} promoted to live trading with params:`,
    candidate.strategyParams
  );
}

/**
 * Manually promote a specific strategy by ID
 */
export async function manualPromote(candidateId: number): Promise<PromotionResult> {
  const candidates = await getStrategyCandidates();
  const candidate = candidates.find((c) => c.id === candidateId);

  if (!candidate) {
    return {
      promoted: false,
      reason: `Candidate ${candidateId} not found`,
    };
  }

  if (candidate.status === "promoted") {
    return {
      promoted: false,
      candidateId,
      reason: "Candidate already promoted",
    };
  }

  await promoteStrategy(candidate);

  return {
    promoted: true,
    candidateId,
    strategyParams: candidate.strategyParams,
    reason: "Manually promoted by user",
    backtestScore: candidate.backtestScore ?? undefined,
    paperScore: candidate.paperScore ?? undefined,
    paperDaysTested: candidate.paperDaysTested,
  };
}

/**
 * Reject a strategy candidate
 */
export async function rejectCandidate(candidateId: number, reason: string): Promise<void> {
  await updateCandidateStatus(candidateId, "rejected");
  console.log(`Strategy ${candidateId} rejected: ${reason}`);
}

/**
 * Get promotion status summary
 */
export async function getPromotionStatus(): Promise<{
  candidates: {
    id: number;
    status: string;
    backtestScore: number | null;
    paperScore: number | null;
    paperDaysTested: number;
    eligible: boolean;
    reasons: string[];
  }[];
  currentLiveConfig: TradingConfig;
}> {
  const candidates = await getStrategyCandidates();
  const currentConfig = await getConfig();

  const candidateStatus = await Promise.all(
    candidates.map(async (c) => {
      let eligibility = { eligible: false, reasons: ["Not evaluated"] };

      if (c.backtestScore !== null) {
        const paperPerformance = await evaluatePaperPerformance(String(c.id), 1000);
        eligibility = meetsPromotionCriteria(
          c.backtestScore,
          paperPerformance.score,
          paperPerformance.daysTested,
          paperPerformance.metrics.maxDrawdown,
          DEFAULT_PROMOTION_CRITERIA
        );
      }

      return {
        id: c.id,
        status: c.status,
        backtestScore: c.backtestScore,
        paperScore: c.paperScore,
        paperDaysTested: c.paperDaysTested,
        eligible: eligibility.eligible,
        reasons: eligibility.reasons,
      };
    })
  );

  return {
    candidates: candidateStatus,
    currentLiveConfig: currentConfig,
  };
}

/**
 * Rollback to previous configuration (if available)
 * Note: This requires keeping a history of configurations
 */
export async function rollbackConfig(): Promise<{
  success: boolean;
  reason: string;
}> {
  // For now, rollback to default config
  const defaultConfig: TradingConfig = {
    enabled: true,
    pairs: ["BTC-EUR", "ETH-EUR", "SOL-EUR"],
    baseWeights: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
    maxTradePercent: 0.2,
    minTradeSizeEur: 5,
    cooldownMinutes: 30,
    stopLossPercent: 0.05,
    maxDrawdownPercent: 0.1,
    aiEnabled: true,
  };

  await setConfig(defaultConfig);

  return {
    success: true,
    reason: "Rolled back to default configuration",
  };
}
