import { NextRequest, NextResponse } from "next/server";
import { getConfig, getPortfolio, getState, setState, getTrades } from "@/lib/store";
import { getTicker, getCandles, Candle } from "@/lib/coinbase";
import { calculateRSI, calculate4hMomentum } from "@/lib/indicators";
import { analyzeMarket } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getConfig();
  if (!config.enabled || !config.aiEnabled) {
    return NextResponse.json({ message: "Trading or AI not enabled" });
  }

  const portfolio = await getPortfolio();
  if (!portfolio) {
    return NextResponse.json({ error: "No portfolio" }, { status: 400 });
  }

  const state = await getState();

  // Fetch prices and candles for all pairs
  const prices: Record<string, number> = {};
  const candles: Record<string, Candle[]> = {};

  await Promise.all(
    config.pairs.map(async (pair) => {
      const [ticker, pairCandles] = await Promise.all([
        getTicker(pair),
        getCandles(pair, "FOUR_HOUR", 24),
      ]);
      prices[pair] = parseFloat(ticker.price);
      candles[pair] = pairCandles;
    })
  );

  // Compute indicators
  const indicators: Record<string, { rsi: number; momentum: number }> = {};
  for (const pair of config.pairs) {
    const closes = candles[pair].map((c) => parseFloat(c.close));
    indicators[pair] = {
      rsi: calculateRSI(closes),
      momentum: calculate4hMomentum(candles[pair]),
    };
  }

  const recentTrades = await getTrades(20);

  // Call Claude
  const result = await analyzeMarket({
    portfolio,
    prices,
    candles,
    indicators,
    recentTrades,
    config,
  });

  // Save to state
  state.aiWeights = result.weights;
  state.aiStopLosses = result.stopLosses;
  state.aiReason = result.reasoning;
  state.lastAnalyzeTime = new Date().toISOString();
  await setState(state);

  return NextResponse.json(result);
}
