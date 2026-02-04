import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioState, TradingConfig, SystemState, TradeRecord, PnLPoint } from "../store";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Paper portfolio - mirrors live portfolio structure
export async function getPaperPortfolio(): Promise<PortfolioState | null> {
  const { data } = await getSupabase()
    .from("paper_portfolio")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data ?? null;
}

export async function setPaperPortfolio(p: PortfolioState): Promise<void> {
  await getSupabase()
    .from("paper_portfolio")
    .upsert({ id: 1, data: p }, { onConflict: "id" });
}

// Paper config - can have different parameters for testing
export async function getPaperConfig(): Promise<TradingConfig | null> {
  const { data } = await getSupabase()
    .from("paper_config")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data ?? null;
}

export async function setPaperConfig(c: TradingConfig): Promise<void> {
  await getSupabase()
    .from("paper_config")
    .upsert({ id: 1, data: c }, { onConflict: "id" });
}

// Paper state - tracks paper trading system state
export async function getPaperState(): Promise<SystemState | null> {
  const { data } = await getSupabase()
    .from("paper_state")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data ?? null;
}

export async function setPaperState(s: SystemState): Promise<void> {
  await getSupabase()
    .from("paper_state")
    .upsert({ id: 1, data: s }, { onConflict: "id" });
}

// Paper trades - record of all paper trades
export interface PaperTradeRecord extends TradeRecord {
  strategyId?: string;
}

export async function addPaperTrade(trade: PaperTradeRecord): Promise<void> {
  await getSupabase().from("paper_trades").insert({
    trade_id: trade.id,
    timestamp: trade.timestamp,
    pair: trade.pair,
    side: trade.side,
    amount_eur: trade.amountEur,
    price: trade.price,
    reason: trade.reason,
    strategy_id: trade.strategyId,
  });
}

export async function getPaperTrades(limit = 50): Promise<PaperTradeRecord[]> {
  const { data } = await getSupabase()
    .from("paper_trades")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.trade_id,
    timestamp: row.timestamp,
    pair: row.pair,
    side: row.side,
    amountEur: row.amount_eur,
    price: row.price,
    reason: row.reason,
    strategyId: row.strategy_id,
  }));
}

// Paper PnL history
export interface PaperPnLPoint extends PnLPoint {
  strategyId?: string;
}

export async function addPaperPnLPoint(point: PaperPnLPoint): Promise<void> {
  await getSupabase().from("paper_pnl_history").insert({
    timestamp: point.timestamp,
    total_value_eur: point.totalValueEur,
    strategy_id: point.strategyId,
  });
}

export async function getPaperPnLHistory(limit = 200): Promise<PaperPnLPoint[]> {
  const { data } = await getSupabase()
    .from("paper_pnl_history")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    timestamp: row.timestamp,
    totalValueEur: row.total_value_eur,
    strategyId: row.strategy_id,
  }));
}

// Initialize paper portfolio with same state as live portfolio
export async function initializePaperPortfolio(
  initialCapital: number = 1000,
  config?: TradingConfig
): Promise<PortfolioState> {
  const defaultConfig: TradingConfig = config ?? {
    enabled: true,
    pairs: ["BTC-EUR", "ETH-EUR", "SOL-EUR"],
    baseWeights: { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
    maxTradePercent: 0.2,
    minTradeSizeEur: 5,
    cooldownMinutes: 30,
    stopLossPercent: 0.05,
    maxDrawdownPercent: 0.1,
    aiEnabled: true,
  };

  const initialPortfolio: PortfolioState = {
    balances: { EUR: initialCapital, BTC: 0, ETH: 0, SOL: 0 },
    weights: {},
    totalValueEur: initialCapital,
    lastUpdate: new Date().toISOString(),
    peakValueEur: initialCapital,
    drawdownPaused: false,
  };

  const initialState: SystemState = {
    lastTickTime: null,
    lastAnalyzeTime: null,
    lastTradeTime: null,
    aiWeights: null,
    aiStopLosses: null,
    aiReason: null,
    errors: [],
  };

  await setPaperPortfolio(initialPortfolio);
  await setPaperConfig(defaultConfig);
  await setPaperState(initialState);

  return initialPortfolio;
}

// Get paper trading status summary
export interface PaperTradingStatus {
  portfolio: PortfolioState | null;
  config: TradingConfig | null;
  state: SystemState | null;
  recentTrades: PaperTradeRecord[];
  pnlHistory: PaperPnLPoint[];
}

export async function getPaperTradingStatus(): Promise<PaperTradingStatus> {
  const [portfolio, config, state, recentTrades, pnlHistory] = await Promise.all([
    getPaperPortfolio(),
    getPaperConfig(),
    getPaperState(),
    getPaperTrades(10),
    getPaperPnLHistory(48), // 48 points = 24h at 30min intervals
  ]);

  return {
    portfolio,
    config,
    state,
    recentTrades,
    pnlHistory,
  };
}

// Reset paper trading (for testing new strategies)
export async function resetPaperTrading(initialCapital: number = 1000): Promise<void> {
  // Clear paper trades and PnL history
  await getSupabase().from("paper_trades").delete().neq("id", 0);
  await getSupabase().from("paper_pnl_history").delete().neq("id", 0);

  // Reinitialize portfolio
  await initializePaperPortfolio(initialCapital);
}
