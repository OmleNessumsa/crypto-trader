import type { StrategyParams, BacktestResult, EvaluationMetrics } from "../backtesting/types";
import { runBacktest, runMultipleBacktests } from "../backtesting/backtester";
import {
  generateParameterGrid,
  generateReducedGrid,
  generateNeighborhoodGrid,
  describeParameters,
} from "./grid-search";
import { addStrategyCandidate } from "../evaluation/evaluator";

export interface OptimizationResult {
  totalCombinations: number;
  testedCombinations: number;
  bestParams: StrategyParams;
  bestScore: number;
  bestMetrics: EvaluationMetrics;
  topResults: {
    params: StrategyParams;
    score: number;
    metrics: EvaluationMetrics;
  }[];
  durationMs: number;
}

export interface OptimizationConfig {
  mode: "full" | "reduced" | "neighborhood";
  baseParams?: StrategyParams; // For neighborhood mode
  days?: number;
  initialCapitalEur?: number;
  topResultsCount?: number;
  maxCombinations?: number; // Limit combinations for time-constrained runs
}

/**
 * Run a full grid search optimization
 */
export async function runOptimization(
  config: OptimizationConfig = { mode: "reduced" }
): Promise<OptimizationResult> {
  const startTime = Date.now();

  // Generate parameter combinations based on mode
  let paramsList: StrategyParams[];

  switch (config.mode) {
    case "full":
      paramsList = generateParameterGrid();
      break;
    case "neighborhood":
      if (!config.baseParams) {
        throw new Error("baseParams required for neighborhood mode");
      }
      paramsList = generateNeighborhoodGrid(config.baseParams);
      break;
    case "reduced":
    default:
      paramsList = generateReducedGrid();
  }

  // Apply max combinations limit if specified
  if (config.maxCombinations && paramsList.length > config.maxCombinations) {
    // Randomly sample combinations
    paramsList = shuffleArray(paramsList).slice(0, config.maxCombinations);
  }

  const totalCombinations = paramsList.length;
  const topResultsCount = config.topResultsCount ?? 5;

  // Track best results
  const results: {
    params: StrategyParams;
    score: number;
    metrics: EvaluationMetrics;
  }[] = [];

  // Run backtests sequentially to avoid overwhelming the API
  let testedCombinations = 0;

  for (const params of paramsList) {
    try {
      const result = await runBacktest({
        days: config.days ?? 30,
        initialCapitalEur: config.initialCapitalEur ?? 1000,
        strategyParams: params,
      });

      results.push({
        params,
        score: result.metrics.combinedScore,
        metrics: result.metrics,
      });

      testedCombinations++;

      // Log progress every 10 combinations
      if (testedCombinations % 10 === 0) {
        console.log(
          `Optimization progress: ${testedCombinations}/${totalCombinations} (${((testedCombinations / totalCombinations) * 100).toFixed(1)}%)`
        );
      }
    } catch (error) {
      console.error(`Backtest failed for params: ${describeParameters(params)}`, error);
      // Continue with next combination
    }

    // Small delay to avoid overwhelming APIs
    await new Promise((r) => setTimeout(r, 50));
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Get top results
  const topResults = results.slice(0, topResultsCount);

  if (topResults.length === 0) {
    throw new Error("No successful backtests completed");
  }

  const best = topResults[0];
  const durationMs = Date.now() - startTime;

  return {
    totalCombinations,
    testedCombinations,
    bestParams: best.params,
    bestScore: best.score,
    bestMetrics: best.metrics,
    topResults,
    durationMs,
  };
}

/**
 * Run optimization and automatically add top candidates for paper testing
 */
export async function runOptimizationWithCandidates(
  config: OptimizationConfig = { mode: "reduced" },
  candidateCount: number = 3
): Promise<{
  optimization: OptimizationResult;
  candidateIds: number[];
}> {
  const optimization = await runOptimization(config);

  // Add top results as strategy candidates
  const candidateIds: number[] = [];

  for (let i = 0; i < Math.min(candidateCount, optimization.topResults.length); i++) {
    const result = optimization.topResults[i];
    const candidateId = await addStrategyCandidate(
      result.params as unknown as Record<string, unknown>,
      result.score
    );
    candidateIds.push(candidateId);
  }

  return {
    optimization,
    candidateIds,
  };
}

/**
 * Quick optimization with limited combinations
 * Useful for quick tests or time-constrained scenarios
 */
export async function runQuickOptimization(
  maxCombinations: number = 20
): Promise<OptimizationResult> {
  return runOptimization({
    mode: "reduced",
    maxCombinations,
    days: 14, // Shorter backtest period for speed
  });
}

/**
 * Fine-tune an existing strategy
 */
export async function fineTuneStrategy(
  baseParams: StrategyParams,
  iterations: number = 2
): Promise<OptimizationResult> {
  let currentBest = baseParams;
  let result: OptimizationResult | null = null;

  for (let i = 0; i < iterations; i++) {
    result = await runOptimization({
      mode: "neighborhood",
      baseParams: currentBest,
      days: 30,
    });

    // Update current best for next iteration
    currentBest = result.bestParams;

    // If improvement is minimal, stop early
    if (i > 0 && result.bestScore - (result.topResults[1]?.score ?? 0) < 0.01) {
      break;
    }
  }

  if (!result) {
    throw new Error("Fine-tuning failed to produce results");
  }

  return result;
}

/**
 * Compare two strategies head-to-head
 */
export async function compareStrategies(
  paramsA: StrategyParams,
  paramsB: StrategyParams,
  days: number = 30
): Promise<{
  winner: "A" | "B" | "tie";
  scoreA: number;
  scoreB: number;
  metricsA: EvaluationMetrics;
  metricsB: EvaluationMetrics;
}> {
  const [resultA, resultB] = await Promise.all([
    runBacktest({ strategyParams: paramsA, days }),
    runBacktest({ strategyParams: paramsB, days }),
  ]);

  const scoreDiff = resultA.metrics.combinedScore - resultB.metrics.combinedScore;
  const winner: "A" | "B" | "tie" =
    Math.abs(scoreDiff) < 0.01 ? "tie" : scoreDiff > 0 ? "A" : "B";

  return {
    winner,
    scoreA: resultA.metrics.combinedScore,
    scoreB: resultB.metrics.combinedScore,
    metricsA: resultA.metrics,
    metricsB: resultB.metrics,
  };
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
