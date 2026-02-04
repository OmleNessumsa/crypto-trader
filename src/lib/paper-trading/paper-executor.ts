import { v4 as uuidv4 } from "uuid";
import type { Candle } from "../coinbase";
import { getTicker, getCandles } from "../coinbase";
import { calculateRSI, calculate4hMomentum } from "../indicators";
import { calculateTargetWeights } from "../strategy";
import { computePortfolioValue, computeCurrentWeights, computeRebalanceTrades } from "../portfolio";
import { checkDrawdown, checkCooldown, clampTradeSize } from "../safety";
import {
  getPaperPortfolio,
  setPaperPortfolio,
  getPaperConfig,
  setPaperConfig,
  getPaperState,
  setPaperState,
  addPaperTrade,
  addPaperPnLPoint,
  initializePaperPortfolio,
  type PaperTradeRecord,
} from "./paper-store";
import { getState } from "../store";
import type { PortfolioState, TradingConfig, SystemState } from "../store";

const COIN_FOR_PAIR: Record<string, string> = {
  "BTC-EUR": "BTC",
  "ETH-EUR": "ETH",
  "SOL-EUR": "SOL",
};

export interface PaperTickResult {
  status: string;
  totalValueEur?: number;
  trades?: number;
  indicators?: Record<string, { rsi: number; momentum: number }>;
  targetWeights?: Record<string, number>;
  error?: string;
}

/**
 * Execute a paper trading tick
 * Mirrors the live trading tick but without real order execution
 */
export async function executePaperTick(strategyId?: string): Promise<PaperTickResult> {
  const now = new Date().toISOString();

  // Get paper trading state (or initialize if not exists)
  let portfolio = await getPaperPortfolio();
  if (!portfolio) {
    portfolio = await initializePaperPortfolio();
  }

  let config = await getPaperConfig();
  if (!config) {
    // Initialize with default config
    await initializePaperPortfolio();
    config = await getPaperConfig();
  }

  let state = await getPaperState();
  if (!state) {
    state = {
      lastTickTime: null,
      lastAnalyzeTime: null,
      lastTradeTime: null,
      aiWeights: null,
      aiStopLosses: null,
      aiReason: null,
      errors: [],
    };
  }

  // Always update lastTickTime
  await setPaperState({ ...state, lastTickTime: now });

  // Early exit if drawdown paused
  if (portfolio.drawdownPaused) {
    return { status: "drawdown_paused" };
  }

  // Cooldown check
  if (checkCooldown(state.lastTradeTime, config!.cooldownMinutes)) {
    return { status: "cooldown" };
  }

  // Fetch market data
  const prices: Record<string, number> = {};
  const candlesMap: Record<string, Candle[]> = {};
  const indicators: Record<string, { rsi: number; momentum: number }> = {};

  await Promise.all(
    config!.pairs.map(async (pair) => {
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
  const balances = portfolio.balances;
  const totalValue = computePortfolioValue(balances, prices);

  // Drawdown check
  const peakValue = portfolio.peakValueEur ?? totalValue;
  const drawdown = checkDrawdown(totalValue, peakValue, config!.maxDrawdownPercent);
  if (drawdown.paused) {
    await setPaperPortfolio({ ...portfolio, drawdownPaused: true });
    return {
      status: "drawdown_triggered",
      totalValueEur: totalValue,
    };
  }

  // Get AI weights from live trading state (same AI decisions)
  const liveState = await getState();
  const aiWeights = config!.aiEnabled ? liveState.aiWeights : null;

  // Calculate target weights
  const targetWeights = calculateTargetWeights({
    pairs: config!.pairs,
    prices,
    candles: candlesMap,
    baseWeights: config!.baseWeights,
    aiWeights,
  });

  // Compute rebalance trades
  const currentWeights = computeCurrentWeights(balances, prices);
  const trades = computeRebalanceTrades(
    currentWeights,
    targetWeights,
    totalValue,
    prices,
    config!.minTradeSizeEur,
    config!.maxTradePercent
  );

  // Execute simulated trades
  const executedTrades: PaperTradeRecord[] = [];
  const updatedBalances = { ...balances };

  for (const trade of trades) {
    const clampedAmount = clampTradeSize(
      trade.amountEur,
      totalValue,
      config!.maxTradePercent
    );
    if (clampedAmount < config!.minTradeSizeEur) continue;

    const coin = COIN_FOR_PAIR[trade.pair];
    if (!coin) continue;

    const price = prices[trade.pair];

    // Apply simulated slippage (0.1%)
    const slippage = 0.001;
    const effectivePrice =
      trade.side === "BUY" ? price * (1 + slippage) : price * (1 - slippage);

    if (trade.side === "BUY") {
      updatedBalances["EUR"] = (updatedBalances["EUR"] ?? 0) - clampedAmount;
      updatedBalances[coin] = (updatedBalances[coin] ?? 0) + clampedAmount / effectivePrice;
    } else {
      updatedBalances["EUR"] = (updatedBalances["EUR"] ?? 0) + clampedAmount;
      updatedBalances[coin] = (updatedBalances[coin] ?? 0) - clampedAmount / effectivePrice;
    }

    const tradeRecord: PaperTradeRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      pair: trade.pair,
      side: trade.side,
      amountEur: clampedAmount,
      price: effectivePrice,
      reason: aiWeights ? "paper_ai_rebalance" : "paper_indicator_rebalance",
      strategyId,
    };
    executedTrades.push(tradeRecord);
    await addPaperTrade(tradeRecord);
  }

  // Update portfolio state
  const newTotalValue = computePortfolioValue(updatedBalances, prices);
  const newPeak = Math.max(peakValue, newTotalValue);

  const updatedPortfolio: PortfolioState = {
    balances: updatedBalances,
    weights: targetWeights,
    totalValueEur: newTotalValue,
    lastUpdate: now,
    peakValueEur: newPeak,
    drawdownPaused: false,
  };
  await setPaperPortfolio(updatedPortfolio);

  // Add PnL point
  await addPaperPnLPoint({
    timestamp: now,
    totalValueEur: newTotalValue,
    strategyId,
  });

  // Update paper state
  await setPaperState({
    ...state,
    lastTickTime: now,
    lastTradeTime: executedTrades.length > 0 ? now : state.lastTradeTime,
    errors: [],
  });

  return {
    status: "ok",
    totalValueEur: newTotalValue,
    trades: executedTrades.length,
    indicators,
    targetWeights,
  };
}

/**
 * Get current paper trading status
 */
export async function getPaperStatus(): Promise<{
  portfolio: PortfolioState | null;
  config: TradingConfig | null;
  state: SystemState | null;
  performance: {
    totalReturn: number;
    currentValue: number;
    initialValue: number;
  };
}> {
  const portfolio = await getPaperPortfolio();
  const config = await getPaperConfig();
  const state = await getPaperState();

  // Calculate performance
  const initialValue = 1000; // Default initial capital
  const currentValue = portfolio?.totalValueEur ?? initialValue;
  const totalReturn = (currentValue - initialValue) / initialValue;

  return {
    portfolio,
    config,
    state,
    performance: {
      totalReturn,
      currentValue,
      initialValue,
    },
  };
}

/**
 * Sync paper trading config with a strategy candidate's parameters
 */
export async function syncPaperConfigWithStrategy(
  strategyParams: Record<string, unknown>
): Promise<void> {
  const config = await getPaperConfig();
  if (!config) return;

  const updatedConfig: TradingConfig = {
    ...config,
    maxTradePercent: (strategyParams.maxTradePercent as number) ?? config.maxTradePercent,
    stopLossPercent: (strategyParams.stopLossPercent as number) ?? config.stopLossPercent,
    cooldownMinutes: (strategyParams.cooldownMinutes as number) ?? config.cooldownMinutes,
    baseWeights: (strategyParams.baseWeights as Record<string, number>) ?? config.baseWeights,
  };

  await setPaperConfig(updatedConfig);
}
