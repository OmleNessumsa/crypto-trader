import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  const { data } = await getSupabase()
    .from("portfolio")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data ?? null;
}

export async function setPortfolio(p: PortfolioState): Promise<void> {
  await getSupabase()
    .from("portfolio")
    .upsert({ id: 1, data: p }, { onConflict: "id" });
}

export async function getConfig(): Promise<TradingConfig> {
  const { data } = await getSupabase()
    .from("config")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data ?? DEFAULT_CONFIG;
}

export async function setConfig(c: TradingConfig): Promise<void> {
  await getSupabase()
    .from("config")
    .upsert({ id: 1, data: c }, { onConflict: "id" });
}

export async function getState(): Promise<SystemState> {
  const { data, error } = await getSupabase()
    .from("system_state")
    .select("data")
    .eq("id", 1)
    .single();

  if (error) {
    console.log("getState error:", error);
  }
  console.log("getState result:", { hasData: !!data, data: data?.data });

  return data?.data ?? DEFAULT_STATE;
}

export async function setState(s: SystemState): Promise<void> {
  const { error } = await getSupabase()
    .from("system_state")
    .upsert({ id: 1, data: s }, { onConflict: "id" });

  if (error) {
    console.log("setState error:", error);
  }
  console.log("setState called with lastTickTime:", s.lastTickTime);
}

export async function addTrade(trade: TradeRecord): Promise<void> {
  await getSupabase().from("trades").insert({
    trade_id: trade.id,
    timestamp: trade.timestamp,
    pair: trade.pair,
    side: trade.side,
    amount_eur: trade.amountEur,
    price: trade.price,
    reason: trade.reason,
    order_id: trade.orderId,
  });
}

export async function getTrades(limit = 50): Promise<TradeRecord[]> {
  const { data } = await getSupabase()
    .from("trades")
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
    orderId: row.order_id,
  }));
}

export async function addPnLPoint(point: PnLPoint): Promise<void> {
  await getSupabase().from("pnl_history").insert({
    timestamp: point.timestamp,
    total_value_eur: point.totalValueEur,
  });
}

export async function getPnLHistory(limit = 200): Promise<PnLPoint[]> {
  const { data } = await getSupabase()
    .from("pnl_history")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    timestamp: row.timestamp,
    totalValueEur: row.total_value_eur,
  }));
}
