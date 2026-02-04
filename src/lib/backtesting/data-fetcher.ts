import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCandles, type Candle } from "../coinbase";
import type { CachedCandles } from "./types";

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

// Cache expiry time (6 hours - candles don't change once formed)
const CACHE_EXPIRY_MS = 6 * 60 * 60 * 1000;

// Granularity in seconds
const GRANULARITY_SECONDS: Record<string, number> = {
  ONE_HOUR: 3600,
  FOUR_HOUR: 14400,
  ONE_DAY: 86400,
};

// Max candles per Coinbase request
const MAX_CANDLES_PER_REQUEST = 300;

/**
 * Fetch candles for a specific time window from cache or API
 */
async function fetchCandlesForWindow(
  pair: string,
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY",
  startTime: Date,
  endTime: Date
): Promise<Candle[]> {
  const granSec = GRANULARITY_SECONDS[granularity];
  const startTs = Math.floor(startTime.getTime() / 1000);
  const endTs = Math.floor(endTime.getTime() / 1000);
  const candlesNeeded = Math.ceil((endTs - startTs) / granSec);

  // Check cache first
  const cacheKey = `${startTs}-${granularity}`;
  const cached = await getCachedCandles(pair, granularity, cacheKey);
  if (cached && cached.candles.length >= candlesNeeded) {
    return cached.candles;
  }

  // Fetch from API in batches
  const allCandles: Candle[] = [];
  let currentEnd = endTs;

  while (currentEnd > startTs) {
    const batchSize = Math.min(MAX_CANDLES_PER_REQUEST, Math.ceil((currentEnd - startTs) / granSec));
    const batchStart = currentEnd - batchSize * granSec;

    const candles = await fetchCandlesBatch(pair, granularity, batchStart, currentEnd);
    allCandles.push(...candles);

    currentEnd = batchStart;

    // Small delay to avoid rate limiting
    if (currentEnd > startTs) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Sort by timestamp descending (most recent first, matching Coinbase format)
  allCandles.sort((a, b) => parseInt(b.start) - parseInt(a.start));

  // Remove duplicates based on start time
  const seen = new Set<string>();
  const uniqueCandles = allCandles.filter((c) => {
    if (seen.has(c.start)) return false;
    seen.add(c.start);
    return true;
  });

  // Cache the result
  await cacheCandles(pair, granularity, cacheKey, uniqueCandles);

  return uniqueCandles;
}

/**
 * Fetch a single batch of candles from Coinbase API
 */
async function fetchCandlesBatch(
  pair: string,
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY",
  startTs: number,
  endTs: number
): Promise<Candle[]> {
  const BASE_URL = "https://api.coinbase.com/api/v3/brokerage";
  const JWT_SERVICE_READ = "https://token-v1-mu.vercel.app/api/generate-jwt";

  const res = await fetch(JWT_SERVICE_READ);
  if (!res.ok) {
    throw new Error(`JWT service ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const token = data.token || data.jwt || data;

  const url = `${BASE_URL}/market/products/${pair}/candles?start=${startTs}&end=${endTs}&granularity=${granularity}`;
  const candleRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!candleRes.ok) {
    throw new Error(`Coinbase API ${candleRes.status}: ${await candleRes.text()}`);
  }

  const candleData = await candleRes.json();
  return candleData.candles ?? [];
}

/**
 * Get cached candles from Supabase
 */
async function getCachedCandles(
  pair: string,
  granularity: string,
  startTime: string
): Promise<CachedCandles | null> {
  const { data } = await getSupabase()
    .from("candle_cache")
    .select("*")
    .eq("pair", pair)
    .eq("granularity", granularity)
    .eq("start_time", startTime)
    .single();

  if (!data) return null;

  // Check if cache is expired
  const fetchedAt = new Date(data.fetched_at).getTime();
  if (Date.now() - fetchedAt > CACHE_EXPIRY_MS) {
    return null;
  }

  return {
    pair: data.pair,
    granularity: data.granularity,
    startTime: data.start_time,
    candles: data.candles,
    fetchedAt: data.fetched_at,
  };
}

/**
 * Cache candles in Supabase
 */
async function cacheCandles(
  pair: string,
  granularity: string,
  startTime: string,
  candles: Candle[]
): Promise<void> {
  await getSupabase().from("candle_cache").upsert(
    {
      pair,
      granularity,
      start_time: startTime,
      candles,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "pair,granularity,start_time" }
  );
}

/**
 * Fetch 30 days of historical candles for a trading pair
 * Uses caching to minimize API calls
 */
export async function fetch30DaysCandles(
  pair: string,
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY" = "FOUR_HOUR"
): Promise<Candle[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return fetchCandlesForWindow(pair, granularity, thirtyDaysAgo, now);
}

/**
 * Fetch historical candles for multiple pairs
 */
export async function fetchHistoricalCandles(
  pairs: string[],
  days: number = 30,
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY" = "FOUR_HOUR"
): Promise<Record<string, Candle[]>> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const results: Record<string, Candle[]> = {};

  // Fetch in parallel with rate limiting
  const batchSize = 2; // Fetch 2 pairs at a time
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (pair) => {
        const candles = await fetchCandlesForWindow(pair, granularity, startDate, now);
        return { pair, candles };
      })
    );

    for (const { pair, candles } of batchResults) {
      results[pair] = candles;
    }

    // Small delay between batches
    if (i + batchSize < pairs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Get all unique timestamps from candles across pairs
 * Returns timestamps in chronological order (oldest first)
 */
export function getTimestampsFromCandles(
  candlesMap: Record<string, Candle[]>
): string[] {
  const timestampSet = new Set<string>();

  for (const candles of Object.values(candlesMap)) {
    for (const candle of candles) {
      timestampSet.add(candle.start);
    }
  }

  return Array.from(timestampSet).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Get candle at or before a specific timestamp
 */
export function getCandleAtTimestamp(
  candles: Candle[],
  timestamp: string
): Candle | null {
  const ts = parseInt(timestamp);

  // Candles are sorted descending, find first one at or before timestamp
  for (const candle of candles) {
    if (parseInt(candle.start) <= ts) {
      return candle;
    }
  }

  return null;
}

/**
 * Get recent candles for indicators (e.g., last 24 candles for RSI)
 */
export function getRecentCandles(
  candles: Candle[],
  timestamp: string,
  count: number
): Candle[] {
  const ts = parseInt(timestamp);
  const result: Candle[] = [];

  for (const candle of candles) {
    if (parseInt(candle.start) <= ts) {
      result.push(candle);
      if (result.length >= count) break;
    }
  }

  return result;
}
