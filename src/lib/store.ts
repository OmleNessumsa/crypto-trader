import { kv } from "@vercel/kv";

// Keys
const PORTFOLIO_KEY = "portfolio";
const CONFIG_KEY = "config";
const TRADES_KEY = "trades";
const STATE_KEY = "state";
const PNL_KEY = "pnl";

// Types
export interface PortfolioState {
  balances: Record<string, number>; // e.g. { "BTC": 0.01, "ETH": 0.1, "SOL": 2, "EUR": 100 }
  weights: Record<string, number>; // target weights { "BTC-EUR": 0.33, ... }
  totalValueEur: number;
  lastUpdate: string;
  peakValueEur: number;
  drawdownPaused: boolean;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  pair: string;
  side: "BUY" | "SELL";
  amountEur: number;
  price: number;
  reason: string;
  orderId?: string;
}

export interface TradingConfig {
  enabled: boolean;
  pairs: string[];
  baseWeights: Record<string, number>;
  maxTradePercent: number; // 0.2 = 20%
  minTradeSizeEur: number; // 5
  cooldownMinutes: number; // 30
  stopLossPercent: number; // 0.05
  maxDrawdownPercent: number; // 0.10
  aiEnabled: boolean;
}

export interface SystemState {
  lastTickTime: string | null;
  lastAnalyzeTime: string | null;
  lastTradeTime: string | null;
  aiWeights: Record<string, number> | null;
  aiStopLosses: Record<string, number> | null;
  aiReason: string | null;
  errors: string[];
}

export interface PnLPoint {
  timestamp: string;
  totalValueEur: number;
}

const DEFAULT_CONFIG: TradingConfig = {
  enabled: false,
  pairs: ["BTC-EUR", "ETH-EUR", "SOL-EUR"],
  baseWeights: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
  maxTradePercent: 0.2,
  minTradeSizeEur: 5,
  cooldownMinutes: 30,
  stopLossPercent: 0.05,
  maxDrawdownPercent: 0.1,
  aiEnabled: true,
};

const DEFAULT_STATE: SystemState = {
  lastTickTime: null,
  lastAnalyzeTime: null,
  lastTradeTime: null,
  aiWeights: null,
  aiStopLosses: null,
  aiReason: null,
  errors: [],
};

// Store operations
export async function getPortfolio(): Promise<PortfolioState | null> {
  return kv.get<PortfolioState>(PORTFOLIO_KEY);
}

export async function setPortfolio(p: PortfolioState): Promise<void> {
  await kv.set(PORTFOLIO_KEY, p);
}

export async function getConfig(): Promise<TradingConfig> {
  const c = await kv.get<TradingConfig>(CONFIG_KEY);
  return c ?? DEFAULT_CONFIG;
}

export async function setConfig(c: TradingConfig): Promise<void> {
  await kv.set(CONFIG_KEY, c);
}

export async function getState(): Promise<SystemState> {
  const s = await kv.get<SystemState>(STATE_KEY);
  return s ?? DEFAULT_STATE;
}

export async function setState(s: SystemState): Promise<void> {
  await kv.set(STATE_KEY, s);
}

export async function addTrade(trade: TradeRecord): Promise<void> {
  await kv.lpush(TRADES_KEY, JSON.stringify(trade));
  // Keep last 500 trades
  await kv.ltrim(TRADES_KEY, 0, 499);
}

export async function getTrades(limit = 50): Promise<TradeRecord[]> {
  const raw = await kv.lrange<string>(TRADES_KEY, 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}

export async function addPnLPoint(point: PnLPoint): Promise<void> {
  await kv.lpush(PNL_KEY, JSON.stringify(point));
  await kv.ltrim(PNL_KEY, 0, 999);
}

export async function getPnLHistory(limit = 200): Promise<PnLPoint[]> {
  const raw = await kv.lrange<string>(PNL_KEY, 0, limit - 1);
  return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
}
