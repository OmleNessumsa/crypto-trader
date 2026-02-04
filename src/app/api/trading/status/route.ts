import { NextResponse } from "next/server";
import { getPortfolio, getConfig, getState, getPnLHistory } from "@/lib/store";
import { getAccounts } from "@/lib/coinbase";

export async function GET() {
  const [portfolio, config, state, pnl] = await Promise.all([
    getPortfolio(),
    getConfig(),
    getState(),
    getPnLHistory(200),
  ]);

  // Try to fetch live balances from Coinbase
  let liveBalances: Record<string, number> | null = null;
  try {
    const accounts = await getAccounts();
    liveBalances = {};
    for (const acc of accounts) {
      const val = parseFloat(acc.available_balance?.value ?? "0");
      if (val > 0) {
        liveBalances[acc.currency] = val;
      }
    }
  } catch {
    // Coinbase error - use stored balances
  }

  // Merge live balances into portfolio if available
  const enrichedPortfolio = portfolio
    ? {
        ...portfolio,
        balances: liveBalances ?? portfolio.balances,
      }
    : liveBalances
      ? {
          balances: liveBalances,
          weights: {},
          totalValueEur: 0,
          lastUpdate: new Date().toISOString(),
          peakValueEur: 0,
          drawdownPaused: false,
        }
      : null;

  return NextResponse.json({
    portfolio: enrichedPortfolio,
    config,
    state,
    pnl,
    timestamp: new Date().toISOString(),
  });
}
