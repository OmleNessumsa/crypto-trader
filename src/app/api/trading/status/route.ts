import { NextResponse } from "next/server";
import { getPortfolio, getConfig, getState } from "@/lib/store";

export async function GET() {
  const [portfolio, config, state] = await Promise.all([
    getPortfolio(),
    getConfig(),
    getState(),
  ]);

  return NextResponse.json({
    portfolio,
    config,
    state,
    timestamp: new Date().toISOString(),
  });
}
