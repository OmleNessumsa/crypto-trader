# Crypto Trader - Architecture Documentation

## Overview

Automated cryptocurrency trading platform built with Next.js, Supabase, and integrated with Coinbase and Claude AI for intelligent portfolio rebalancing.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Exchange | Coinbase Advanced Trade API |
| AI | Claude API (Anthropic) |
| Hosting | Vercel |
| Automation | n8n (workflow automation) |

## Project Structure

```
src/
├── app/
│   ├── api/trading/
│   │   ├── analyze/route.ts   # AI market analysis (Claude)
│   │   ├── config/route.ts    # GET/POST trading configuration
│   │   ├── history/route.ts   # GET trade history & PnL
│   │   ├── status/route.ts    # GET current portfolio status
│   │   └── tick/route.ts      # POST main trading loop (cron)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx          # Main dashboard container
│   ├── CoinCard.tsx           # Individual coin display
│   ├── PnLChart.tsx           # Profit/Loss chart
│   ├── PortfolioChart.tsx     # Portfolio allocation pie chart
│   ├── StatusBadge.tsx        # Trading status indicator
│   ├── StrategyConfig.tsx     # Configuration panel
│   └── TradeHistory.tsx       # Trade log table
└── lib/
    ├── claude.ts              # Claude AI integration
    ├── coinbase.ts            # Coinbase API client
    ├── indicators.ts          # Technical indicators (RSI, momentum)
    ├── portfolio.ts           # Portfolio calculations
    ├── safety.ts              # Risk management (drawdown, cooldown)
    ├── store.ts               # Supabase data layer
    └── strategy.ts            # Weight calculation logic
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    n8n      │────▶│  /tick      │────▶│  Coinbase   │
│  (cron)     │     │  endpoint   │     │  API        │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Supabase   │
                    │  (state)    │
                    └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐
│  Dashboard  │◀────│  /status    │
│  (React)    │     │  endpoint   │
└─────────────┘     └─────────────┘
```

## API Endpoints

### `POST /api/trading/tick`
Main trading loop, called by n8n cron job.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Flow:**
1. Fetch current config, portfolio, state from Supabase
2. Update `lastTickTime` (even if disabled)
3. Check if trading enabled, not paused by drawdown
4. Check cooldown period
5. Fetch market data from Coinbase (prices, candles)
6. Calculate technical indicators (RSI, momentum)
7. Compute target weights (using AI weights if enabled)
8. Calculate rebalance trades
9. Execute trades via Coinbase
10. Update portfolio state and PnL history

**Response:**
```json
{
  "status": "ok|disabled|cooldown|drawdown_paused",
  "totalValueEur": 1234.56,
  "trades": 2,
  "indicators": {...},
  "targetWeights": {...}
}
```

### `POST /api/trading/analyze`
AI-powered market analysis using Claude.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Flow:**
1. Fetch portfolio, prices, candles, indicators
2. Send to Claude for analysis
3. Receive recommended weights and stop-losses
4. Save to system state for next tick

### `GET /api/trading/status`
Returns current portfolio status for dashboard.

**Response:**
```json
{
  "portfolio": {...},
  "config": {...},
  "state": {...},
  "pnl": [...],
  "timestamp": "..."
}
```

### `GET/POST /api/trading/config`
Get or update trading configuration.

### `GET /api/trading/history`
Returns trade history and PnL data.

## Database Schema (Supabase)

```sql
-- Single-row tables for state
CREATE TABLE portfolio (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  CHECK (id = 1)
);

CREATE TABLE config (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  CHECK (id = 1)
);

CREATE TABLE system_state (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  CHECK (id = 1)
);

-- History tables
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  trade_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  pair TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_eur DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  reason TEXT,
  order_id TEXT
);

CREATE TABLE pnl_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  total_value_eur DECIMAL NOT NULL
);

-- Indexes
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_pnl_timestamp ON pnl_history(timestamp DESC);
```

## Environment Variables

| Variable | Description | Where |
|----------|-------------|-------|
| `SUPABASE_URL` | Supabase project URL | Vercel |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Vercel |
| `CRON_SECRET` | Shared secret for n8n auth | Vercel + n8n |
| `COINBASE_API_KEY_NAME` | CDP API key name (orgs/xxx/apiKeys/yyy) | Vercel |
| `COINBASE_PRIVATE_KEY` | EC private key (PEM format) | Vercel |
| `ANTHROPIC_API_KEY` | Claude API key | Vercel |

## n8n Workflow

The n8n workflow triggers the trading loop:

1. **Schedule Trigger** - Runs every X minutes
2. **HTTP Request: POST /tick**
   - URL: `{{$env.VERCEL_URL}}/api/trading/tick`
   - Header: `Authorization: Bearer {{$env.CRON_SECRET}}`
3. **(Optional) HTTP Request: POST /analyze** - For AI analysis

## Key Data Types

### PortfolioState
```typescript
interface PortfolioState {
  balances: Record<string, number>;    // { "BTC": 0.01, "ETH": 0.1, "EUR": 100 }
  weights: Record<string, number>;     // { "BTC-EUR": 0.33, ... }
  totalValueEur: number;
  lastUpdate: string;
  peakValueEur: number;
  drawdownPaused: boolean;
}
```

### TradingConfig
```typescript
interface TradingConfig {
  enabled: boolean;
  pairs: string[];                     // ["BTC-EUR", "ETH-EUR", "SOL-EUR"]
  baseWeights: Record<string, number>;
  maxTradePercent: number;             // 0.2 = max 20% per trade
  minTradeSizeEur: number;             // 5 = minimum €5
  cooldownMinutes: number;             // 30 = wait between trades
  stopLossPercent: number;             // 0.05 = 5% stop loss
  maxDrawdownPercent: number;          // 0.10 = 10% max drawdown
  aiEnabled: boolean;
}
```

### SystemState
```typescript
interface SystemState {
  lastTickTime: string | null;
  lastAnalyzeTime: string | null;
  lastTradeTime: string | null;
  aiWeights: Record<string, number> | null;
  aiStopLosses: Record<string, number> | null;
  aiReason: string | null;
  errors: string[];
}
```

## Safety Features

1. **Drawdown Protection** - Pauses trading if portfolio drops below threshold
2. **Trade Cooldown** - Prevents overtrading with configurable wait period
3. **Max Trade Size** - Limits single trade to percentage of portfolio
4. **Min Trade Size** - Avoids dust trades below €5

## Debugging

### Check Vercel Logs
```bash
vercel logs crypto-trader-gray.vercel.app --follow
```

### Check Supabase Data
```sql
SELECT * FROM system_state;
SELECT * FROM portfolio;
SELECT * FROM config;
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Wrong CRON_SECRET | Verify header is `Bearer {secret}` |
| "disabled" response | Trading not enabled | Enable in config or dashboard |
| "cooldown" response | Recent trade | Wait for cooldown period |
| Supabase errors | RLS or missing tables | Check table creation, RLS policies |
| Coinbase errors | Invalid API key | Check key name format and permissions |

## Deployment

```bash
# Build and deploy
npm run build
vercel --prod

# Or with SSL issues
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vercel --prod --yes
```

## Future Improvements

- [ ] Add more trading pairs
- [ ] Implement stop-loss execution
- [ ] Add backtesting capability
- [ ] Mobile-responsive dashboard
- [ ] Webhook notifications (Telegram/Discord)
- [ ] Multiple strategy support
