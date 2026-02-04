import { NextRequest, NextResponse } from "next/server";
import { checkAndPromote } from "@/lib/evaluation/promoter";

/**
 * Auto-promote endpoint for daily cron job
 * Checks if any strategy candidates meet promotion criteria and promotes them
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check and promote eligible strategies
    const result = await checkAndPromote();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
