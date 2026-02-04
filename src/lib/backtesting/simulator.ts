import type { Candle } from "../coinbase";
import type { StrategyParams, SimulatedTrade, PortfolioSnapshot } from "./types";
import { calculateRSI, calculate4hMomentum } from "../indicators";
import { computePortfolioValue, computeCurrentWeights, computeRebalanceTrades } from "../portfolio";

const COIN_FOR_PAIR: Record<string, string> = {
  "BTC-EUR": "BTC",
  "ETH-EUR": "ETH",
  "SOL-EUR": "SOL",
};

export interface SimulatorState {
  balances: Record<string, number>;
  lastTradeTime: number | null;
  peakValueEur: number;
  trades: SimulatedTrade[];
  snapshots: PortfolioSnapshot[];
}

export interface SimulatorConfig {
  pairs: string[];
  strategyParams: StrategyParams;
  minTradeSizeEur: number;
}

/**
 * Trade simulation engine for backtesting
 * Simulates trading logic without actual order execution
 */
export class TradeSimulator {
  private state: SimulatorState;
  private config: SimulatorConfig;

  constructor(initialCapitalEur: number, config: SimulatorConfig) {
    this.config = config;
    this.state = {
      balances: { EUR: initialCapitalEur, BTC: 0, ETH: 0, SOL: 0 },
      lastTradeTime: null,
      peakValueEur: initialCapitalEur,
      trades: [],
      snapshots: [],
    };
  }

  /**
   * Process a single timestamp/candle update
   */
  processCandle(
    timestamp: string,
    prices: Record<string, number>,
    candlesMap: Record<string, Candle[]>
  ): void {
    const timestampMs = parseInt(timestamp) * 1000;
    const { strategyParams } = this.config;

    // Calculate current portfolio value
    const totalValue = computePortfolioValue(this.state.balances, prices);

    // Update peak value
    this.state.peakValueEur = Math.max(this.state.peakValueEur, totalValue);

    // Check drawdown - pause trading if exceeded
    const drawdown = (this.state.peakValueEur - totalValue) / this.state.peakValueEur;
    if (drawdown >= 0.1) {
      // 10% max drawdown
      this.recordSnapshot(timestamp, prices);
      return;
    }

    // Check cooldown
    if (this.state.lastTradeTime) {
      const cooldownMs = strategyParams.cooldownMinutes * 60 * 1000;
      if (timestampMs - this.state.lastTradeTime < cooldownMs) {
        this.recordSnapshot(timestamp, prices);
        return;
      }
    }

    // Calculate target weights based on indicators
    const targetWeights = this.calculateTargetWeights(prices, candlesMap);

    // Compute rebalance trades
    const currentWeights = computeCurrentWeights(this.state.balances, prices);
    const trades = computeRebalanceTrades(
      currentWeights,
      targetWeights,
      totalValue,
      prices,
      this.config.minTradeSizeEur,
      strategyParams.maxTradePercent
    );

    // Execute simulated trades
    for (const trade of trades) {
      this.executeTrade(timestamp, trade.pair, trade.side, trade.amountEur, prices[trade.pair]);
    }

    // Record snapshot
    this.recordSnapshot(timestamp, prices);
  }

  /**
   * Calculate target weights based on indicators and strategy params
   */
  private calculateTargetWeights(
    prices: Record<string, number>,
    candlesMap: Record<string, Candle[]>
  ): Record<string, number> {
    const { strategyParams, pairs } = this.config;
    const raw: Record<string, number> = {};

    for (const pair of pairs) {
      let weight = strategyParams.baseWeights[pair] ?? 1 / pairs.length;
      const candles = candlesMap[pair] ?? [];

      // Momentum tilt
      const momentum = calculate4hMomentum(candles);
      const momentumTilt = Math.max(-0.15, Math.min(0.15, momentum / 100));
      weight += momentumTilt;

      // RSI adjustment with configurable thresholds
      const closes = candles.map((c) => parseFloat(c.close));
      const rsi = calculateRSI(closes);
      if (rsi > strategyParams.rsiOverboughtThreshold) {
        weight *= 0.8; // reduce overextended
      } else if (rsi < strategyParams.rsiOversoldThreshold) {
        weight *= 1.2; // increase oversold
      }

      raw[pair] = Math.max(0, weight);
    }

    // Normalize weights
    const total = Object.values(raw).reduce((sum, w) => sum + w, 0);
    if (total === 0) {
      const equal = 1 / pairs.length;
      const result: Record<string, number> = {};
      for (const p of pairs) result[p] = equal;
      return result;
    }

    const result: Record<string, number> = {};
    for (const p of pairs) {
      result[p] = (raw[p] ?? 0) / total;
    }
    return result;
  }

  /**
   * Execute a simulated trade
   */
  private executeTrade(
    timestamp: string,
    pair: string,
    side: "BUY" | "SELL",
    amountEur: number,
    price: number
  ): void {
    const coin = COIN_FOR_PAIR[pair];
    if (!coin) return;

    // Apply simulated slippage (0.1%)
    const slippage = 0.001;
    const effectivePrice = side === "BUY" ? price * (1 + slippage) : price * (1 - slippage);

    if (side === "BUY") {
      this.state.balances["EUR"] = (this.state.balances["EUR"] ?? 0) - amountEur;
      this.state.balances[coin] = (this.state.balances[coin] ?? 0) + amountEur / effectivePrice;
    } else {
      this.state.balances["EUR"] = (this.state.balances["EUR"] ?? 0) + amountEur;
      this.state.balances[coin] = (this.state.balances[coin] ?? 0) - amountEur / effectivePrice;
    }

    this.state.lastTradeTime = parseInt(timestamp) * 1000;

    this.state.trades.push({
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      pair,
      side,
      amountEur,
      price: effectivePrice,
      reason: "backtest_rebalance",
    });
  }

  /**
   * Record a portfolio snapshot
   */
  private recordSnapshot(timestamp: string, prices: Record<string, number>): void {
    const totalValue = computePortfolioValue(this.state.balances, prices);
    const currentWeights = computeCurrentWeights(this.state.balances, prices);

    this.state.snapshots.push({
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      balances: { ...this.state.balances },
      totalValueEur: totalValue,
      weights: currentWeights,
    });
  }

  /**
   * Get all executed trades
   */
  getTrades(): SimulatedTrade[] {
    return this.state.trades;
  }

  /**
   * Get all portfolio snapshots
   */
  getSnapshots(): PortfolioSnapshot[] {
    return this.state.snapshots;
  }

  /**
   * Get current balances
   */
  getBalances(): Record<string, number> {
    return { ...this.state.balances };
  }

  /**
   * Get final portfolio value
   */
  getFinalValue(prices: Record<string, number>): number {
    return computePortfolioValue(this.state.balances, prices);
  }
}
