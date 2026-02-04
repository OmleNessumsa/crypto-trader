import { NextRequest, NextResponse } from "next/server";
import { executePaperTick } from "@/lib/paper-trading/paper-executor";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional strategy ID from body
    const body = await req.json().catch(() => ({}));
    const strategyId = body.strategyId as string | undefined;

    // Execute paper trading tick
    const result = await executePaperTick(strategyId);

    return NextResponse.json(result);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
