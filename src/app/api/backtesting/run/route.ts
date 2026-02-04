import { NextRequest, NextResponse } from "next/server";
import { runBacktest, getBacktestRuns, getBestBacktest } from "@/lib/backtesting/backtester";
import type { StrategyParams } from "@/lib/backtesting/types";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const days = body.days ?? 30;
    const initialCapitalEur = body.initialCapitalEur ?? 1000;
    const strategyParams = body.strategyParams as StrategyParams | undefined;

    // Run backtest
    const result = await runBacktest({
      days,
      initialCapitalEur,
      strategyParams,
    });

    return NextResponse.json({
      status: "completed",
      runId: result.runId,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      metrics: result.metrics,
      tradeCount: result.trades.length,
      snapshotCount: result.snapshots.length,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth check for admin access
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isAuthed = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Get query params
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "best") {
      // Get best performing backtest
      const best = await getBestBacktest();
      return NextResponse.json({ best });
    }

    // Get recent backtest runs
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const runs = await getBacktestRuns(limit);

    return NextResponse.json({
      runs: runs.map((run) => ({
        runId: run.runId,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        status: run.status,
        results: run.results,
      })),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
