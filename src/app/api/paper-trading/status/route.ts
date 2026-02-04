import { NextRequest, NextResponse } from "next/server";
import { getPaperTradingStatus, resetPaperTrading, initializePaperPortfolio } from "@/lib/paper-trading/paper-store";
import { getPaperStatus } from "@/lib/paper-trading/paper-executor";

export async function GET(req: NextRequest) {
  try {
    // Get full paper trading status
    const status = await getPaperTradingStatus();
    const performance = await getPaperStatus();

    return NextResponse.json({
      portfolio: status.portfolio,
      config: status.config,
      state: status.state,
      recentTrades: status.recentTrades,
      pnlHistory: status.pnlHistory,
      performance: performance.performance,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check for reset/initialize operations
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const initialCapital = body.initialCapital ?? 1000;

    switch (action) {
      case "reset":
        await resetPaperTrading(initialCapital);
        return NextResponse.json({
          status: "reset",
          message: `Paper trading reset with ${initialCapital} EUR initial capital`,
        });

      case "initialize":
        const portfolio = await initializePaperPortfolio(initialCapital, body.config);
        return NextResponse.json({
          status: "initialized",
          portfolio,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
