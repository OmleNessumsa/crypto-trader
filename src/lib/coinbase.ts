import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const BASE_URL = "https://api.coinbase.com/api/v3/brokerage";

// CDP API Key format: organizations/{org_id}/apiKeys/{key_id}
// Set COINBASE_API_KEY_NAME to the full key name
// Set COINBASE_PRIVATE_KEY to the EC private key (PEM format)
function generateJWT(): string {
  const { COINBASE_API_KEY_NAME, COINBASE_PRIVATE_KEY } = process.env;
  if (!COINBASE_API_KEY_NAME || !COINBASE_PRIVATE_KEY) {
    throw new Error("Missing COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "cdp",
    sub: COINBASE_API_KEY_NAME,
    aud: ["cdp_service"],
    nbf: now,
    exp: now + 120,
    uris: ["GET /*", "POST /*"],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, COINBASE_PRIVATE_KEY, {
    algorithm: "ES256",
    keyid: COINBASE_API_KEY_NAME,
    header: { alg: "ES256", typ: "JWT", nonce: uuidv4() },
  } as any);
}

async function cbFetch(path: string, options?: RequestInit) {
  const token = generateJWT();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase API ${res.status}: ${text}`);
  }
  return res.json();
}

export interface Ticker {
  product_id: string;
  price: string;
  volume_24h: string;
  price_percentage_change_24h: string;
}

export interface Candle {
  start: string;
  low: string;
  high: string;
  open: string;
  close: string;
  volume: string;
}

export async function getTicker(productId: string): Promise<Ticker> {
  const data = await cbFetch(`/market/products/${productId}/ticker?limit=1`);
  return {
    product_id: productId,
    price: data.trades?.[0]?.price ?? "0",
    volume_24h: data.trades?.[0]?.size ?? "0",
    price_percentage_change_24h: "0",
  };
}

export async function getBestBidAsk(
  productIds: string[]
): Promise<Record<string, { bid: string; ask: string }>> {
  const params = productIds.map((id) => `product_ids=${id}`).join("&");
  const data = await cbFetch(`/best_bid_ask?${params}`);
  const result: Record<string, { bid: string; ask: string }> = {};
  for (const p of data.pricebooks ?? []) {
    result[p.product_id] = {
      bid: p.bids?.[0]?.price ?? "0",
      ask: p.asks?.[0]?.price ?? "0",
    };
  }
  return result;
}

export async function getCandles(
  productId: string,
  granularity: "ONE_HOUR" | "FOUR_HOUR" | "ONE_DAY" = "FOUR_HOUR",
  limit = 24
): Promise<Candle[]> {
  const end = Math.floor(Date.now() / 1000);
  const granMap = { ONE_HOUR: 3600, FOUR_HOUR: 14400, ONE_DAY: 86400 };
  const start = end - granMap[granularity] * limit;
  const data = await cbFetch(
    `/market/products/${productId}/candles?start=${start}&end=${end}&granularity=${granularity}`
  );
  return data.candles ?? [];
}

export async function getAccounts(): Promise<
  { uuid: string; currency: string; available_balance: { value: string } }[]
> {
  const data = await cbFetch("/accounts?limit=49");
  return data.accounts ?? [];
}

export interface OrderResult {
  success: boolean;
  order_id?: string;
  error?: string;
}

export async function createMarketOrder(
  productId: string,
  side: "BUY" | "SELL",
  quoteSize: string
): Promise<OrderResult> {
  const clientOrderId = uuidv4();
  const body: Record<string, unknown> = {
    client_order_id: clientOrderId,
    product_id: productId,
    side,
    order_configuration: {
      market_market_ioc: {
        quote_size: quoteSize,
      },
    },
  };

  try {
    const data = await cbFetch("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      success: data.success ?? false,
      order_id: data.success_response?.order_id,
      error: data.failure_response?.error,
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
