import { NextResponse } from "next/server";
import { getTrades, getPnLHistory } from "@/lib/store";

export async function GET() {
  const [trades, pnl] = await Promise.all([
    getTrades(50),
    getPnLHistory(200),
  ]);

  return NextResponse.json({ trades, pnl });
}
