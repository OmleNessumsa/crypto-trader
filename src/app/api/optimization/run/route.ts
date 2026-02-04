import { NextRequest, NextResponse } from "next/server";
import {
  runOptimization,
  runOptimizationWithCandidates,
  runQuickOptimization,
  fineTuneStrategy,
  type OptimizationConfig,
} from "@/lib/optimization/optimizer";
import { describeParameters } from "@/lib/optimization/grid-search";
import type { StrategyParams } from "@/lib/backtesting/types";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = (body.mode as OptimizationConfig["mode"]) ?? "reduced";
    const days = body.days ?? 30;
    const addCandidates = body.addCandidates ?? true;
    const candidateCount = body.candidateCount ?? 3;
    const maxCombinations = body.maxCombinations as number | undefined;
    const baseParams = body.baseParams as StrategyParams | undefined;

    // Determine optimization type
    if (body.quick) {
      // Quick optimization for testing
      const result = await runQuickOptimization(body.maxCombinations ?? 20);
      return NextResponse.json({
        status: "completed",
        type: "quick",
        ...formatResult(result),
      });
    }

    if (body.fineTune && baseParams) {
      // Fine-tune existing strategy
      const result = await fineTuneStrategy(baseParams, body.iterations ?? 2);
      return NextResponse.json({
        status: "completed",
        type: "fine_tune",
        ...formatResult(result),
      });
    }

    // Standard optimization
    const config: OptimizationConfig = {
      mode,
      days,
      baseParams,
      maxCombinations,
    };

    if (addCandidates) {
      const { optimization, candidateIds } = await runOptimizationWithCandidates(
        config,
        candidateCount
      );
      return NextResponse.json({
        status: "completed",
        type: "optimization_with_candidates",
        candidateIds,
        ...formatResult(optimization),
      });
    } else {
      const result = await runOptimization(config);
      return NextResponse.json({
        status: "completed",
        type: "optimization",
        ...formatResult(result),
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

function formatResult(result: {
  totalCombinations: number;
  testedCombinations: number;
  bestParams: StrategyParams;
  bestScore: number;
  bestMetrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    combinedScore: number;
  };
  topResults: {
    params: StrategyParams;
    score: number;
    metrics: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
      totalTrades: number;
      combinedScore: number;
    };
  }[];
  durationMs: number;
}) {
  return {
    totalCombinations: result.totalCombinations,
    testedCombinations: result.testedCombinations,
    durationMs: result.durationMs,
    durationMinutes: (result.durationMs / 60000).toFixed(2),
    best: {
      params: result.bestParams,
      description: describeParameters(result.bestParams),
      score: result.bestScore,
      metrics: result.bestMetrics,
    },
    topResults: result.topResults.map((r, i) => ({
      rank: i + 1,
      description: describeParameters(r.params),
      score: r.score,
      metrics: r.metrics,
    })),
  };
}
