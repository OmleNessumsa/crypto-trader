import { NextResponse } from "next/server";
import { getPortfolio, getConfig, getState, getPnLHistory } from "@/lib/store";

export async function GET() {
  const [portfolio, config, state, pnl] = await Promise.all([
    getPortfolio(),
    getConfig(),
    getState(),
    getPnLHistory(200),
  ]);

  return NextResponse.json({
    portfolio,
    config,
    state,
    pnl,
    timestamp: new Date().toISOString(),
  });
}
