import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getConfig,
  getPortfolio,
  getState,
  setPortfolio,
  setState,
  addTrade,
  addPnLPoint,
  type PortfolioState,
  type TradeRecord,
} from "@/lib/store";
import { getTicker, getCandles, createMarketOrder, type Candle } from "@/lib/coinbase";
import { calculateRSI, calculate4hMomentum } from "@/lib/indicators";
import { calculateTargetWeights } from "@/lib/strategy";
import { checkDrawdown, checkCooldown, clampTradeSize } from "@/lib/safety";
import {
  computePortfolioValue,
  computeCurrentWeights,
  computeRebalanceTrades,
} from "@/lib/portfolio";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getConfig();
    const portfolio = await getPortfolio();
    const state = await getState();

    // Early exit if not enabled or drawdown paused
    if (!config.enabled) {
      return NextResponse.json({ status: "disabled" });
    }
    if (portfolio?.drawdownPaused) {
      return NextResponse.json({ status: "drawdown_paused" });
    }

    // Cooldown check
    if (checkCooldown(state.lastTradeTime, config.cooldownMinutes)) {
      return NextResponse.json({ status: "cooldown" });
    }

    // Fetch market data
    const prices: Record<string, number> = {};
    const candlesMap: Record<string, Candle[]> = {};
    const indicators: Record<string, { rsi: number; momentum: number }> = {};

    await Promise.all(
      config.pairs.map(async (pair) => {
        const [ticker, candles] = await Promise.all([
          getTicker(pair),
          getCandles(pair, "FOUR_HOUR", 24),
        ]);
        prices[pair] = parseFloat(ticker.price);
        candlesMap[pair] = candles;

        const closes = candles.map((c) => parseFloat(c.close));
        indicators[pair] = {
          rsi: calculateRSI(closes),
          momentum: calculate4hMomentum(candles),
        };
      })
    );

    // Current portfolio value
    const balances = portfolio?.balances ?? { EUR: 0, BTC: 0, ETH: 0, SOL: 0 };
    const totalValue = computePortfolioValue(balances, prices);

    // Drawdown check
    const peakValue = portfolio?.peakValueEur ?? totalValue;
    const drawdown = checkDrawdown(totalValue, peakValue, config.maxDrawdownPercent);
    if (drawdown.paused) {
      if (portfolio) {
        await setPortfolio({ ...portfolio, drawdownPaused: true });
      }
      return NextResponse.json({
        status: "drawdown_triggered",
        drawdownPercent: drawdown.drawdownPercent,
      });
    }

    // Calculate target weights
    const aiWeights = config.aiEnabled ? state.aiWeights : null;
    const targetWeights = calculateTargetWeights({
      pairs: config.pairs,
      prices,
      candles: candlesMap,
      baseWeights: config.baseWeights,
      aiWeights,
    });

    // Compute rebalance trades
    const currentWeights = computeCurrentWeights(balances, prices);
    const trades = computeRebalanceTrades(
      currentWeights,
      targetWeights,
      totalValue,
      prices,
      config.minTradeSizeEur,
      config.maxTradePercent
    );

    // Execute trades
    const executedTrades: TradeRecord[] = [];
    const updatedBalances = { ...balances };

    for (const trade of trades) {
      const clampedAmount = clampTradeSize(
        trade.amountEur,
        totalValue,
        config.maxTradePercent
      );
      if (clampedAmount < config.minTradeSizeEur) continue;

      const result = await createMarketOrder(
        trade.pair,
        trade.side,
        clampedAmount.toFixed(2)
      );

      if (result.success) {
        const coin = trade.pair.split("-")[0];
        const price = prices[trade.pair];

        if (trade.side === "BUY") {
          updatedBalances["EUR"] = (updatedBalances["EUR"] ?? 0) - clampedAmount;
          updatedBalances[coin] = (updatedBalances[coin] ?? 0) + clampedAmount / price;
        } else {
          updatedBalances["EUR"] = (updatedBalances["EUR"] ?? 0) + clampedAmount;
          updatedBalances[coin] = (updatedBalances[coin] ?? 0) - clampedAmount / price;
        }

        const tradeRecord: TradeRecord = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          pair: trade.pair,
          side: trade.side,
          amountEur: clampedAmount,
          price,
          reason: aiWeights ? "ai_rebalance" : "indicator_rebalance",
          orderId: result.order_id,
        };
        executedTrades.push(tradeRecord);
        await addTrade(tradeRecord);
      }
    }

    // Update portfolio state
    const newTotalValue = computePortfolioValue(updatedBalances, prices);
    const newPeak = Math.max(peakValue, newTotalValue);
    const now = new Date().toISOString();

    const updatedPortfolio: PortfolioState = {
      balances: updatedBalances,
      weights: targetWeights,
      totalValueEur: newTotalValue,
      lastUpdate: now,
      peakValueEur: newPeak,
      drawdownPaused: false,
    };
    await setPortfolio(updatedPortfolio);

    // Add PnL point
    await addPnLPoint({ timestamp: now, totalValueEur: newTotalValue });

    // Update system state
    await setState({
      ...state,
      lastTickTime: now,
      lastTradeTime: executedTrades.length > 0 ? now : state.lastTradeTime,
      errors: [],
    });

    return NextResponse.json({
      status: "ok",
      totalValueEur: newTotalValue,
      trades: executedTrades.length,
      indicators,
      targetWeights,
    });
  } catch (error) {
    const state = await getState();
    const errMsg = error instanceof Error ? error.message : String(error);
    await setState({
      ...state,
      lastTickTime: new Date().toISOString(),
      errors: [errMsg, ...state.errors.slice(0, 9)],
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
