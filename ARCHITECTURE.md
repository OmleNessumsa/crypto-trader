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
│   ├── api/
│   │   ├── trading/
│   │   │   ├── analyze/route.ts   # AI market analysis (Claude)
│   │   │   ├── config/route.ts    # GET/POST trading configuration
│   │   │   ├── history/route.ts   # GET trade history & PnL
│   │   │   ├── status/route.ts    # GET current portfolio status
│   │   │   └── tick/route.ts      # POST main trading loop (cron)
│   │   ├── backtesting/
│   │   │   └── run/route.ts       # POST/GET backtest runs
│   │   ├── paper-trading/
│   │   │   ├── tick/route.ts      # POST paper trading tick
│   │   │   └── status/route.ts    # GET/POST paper trading status
│   │   └── optimization/
│   │       ├── run/route.ts       # POST run optimization
│   │       ├── promote/route.ts   # GET/POST strategy promotion
│   │       └── auto-promote/route.ts # POST auto-promote check
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
    ├── strategy.ts            # Weight calculation logic
    ├── backtesting/
    │   ├── types.ts           # Backtest types & interfaces
    │   ├── data-fetcher.ts    # Historical candle fetching with cache
    │   ├── simulator.ts       # Trade simulation engine
    │   └── backtester.ts      # Main backtest engine
    ├── paper-trading/
    │   ├── paper-store.ts     # Paper trading Supabase operations
    │   └── paper-executor.ts  # Paper trade execution
    ├── evaluation/
    │   ├── metrics.ts         # Performance metrics calculation
    │   ├── evaluator.ts       # Strategy evaluation
    │   └── promoter.ts        # Paper to live promotion logic
    └── optimization/
        ├── grid-search.ts     # Parameter grid generation
        └── optimizer.ts       # Grid search optimization engine
```

## Data Flow

### Live Trading Flow
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

### Backtesting & Optimization Flow
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Weekly Cron    │────▶│  /optimization  │────▶│  Backtester     │
│  (n8n Sunday)   │     │  /run           │     │  (30d candles)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┘
                        ▼
                 ┌─────────────────┐
                 │  Strategy       │
                 │  Candidates     │
                 └─────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│  Paper Trading  │             │  Daily Cron     │
│  (parallel)     │             │  /auto-promote  │
└─────────────────┘             └─────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
                 ┌─────────────────┐
                 │  Promote to     │
                 │  Live Config    │
                 └─────────────────┘
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

---

## Backtesting & Paper Trading API

### `POST /api/backtesting/run`
Run a backtest on historical data.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Body:**
```json
{
  "days": 30,
  "initialCapitalEur": 1000,
  "strategyParams": {
    "maxTradePercent": 0.2,
    "stopLossPercent": 0.05,
    "cooldownMinutes": 30,
    "rsiOversoldThreshold": 30,
    "rsiOverboughtThreshold": 70,
    "baseWeights": {"BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334}
  }
}
```

**Response:**
```json
{
  "status": "completed",
  "runId": "uuid",
  "metrics": {
    "totalReturn": 0.15,
    "sharpeRatio": 1.2,
    "maxDrawdown": 0.08,
    "winRate": 0.55,
    "totalTrades": 45,
    "combinedScore": 0.65
  }
}
```

### `GET /api/backtesting/run`
List recent backtest runs.

### `POST /api/paper-trading/tick`
Execute a paper trading tick (parallel to live).

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Response:**
```json
{
  "status": "ok",
  "totalValueEur": 1023.45,
  "trades": 2,
  "indicators": {...},
  "targetWeights": {...}
}
```

### `GET /api/paper-trading/status`
Get paper trading portfolio status.

### `POST /api/paper-trading/status`
Initialize or reset paper trading.

**Body:**
```json
{
  "action": "initialize|reset",
  "initialCapital": 1000
}
```

### `POST /api/optimization/run`
Run grid search optimization.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Body:**
```json
{
  "mode": "reduced|full|neighborhood",
  "days": 30,
  "addCandidates": true,
  "candidateCount": 3,
  "maxCombinations": 50
}
```

**Response:**
```json
{
  "status": "completed",
  "candidateIds": [1, 2, 3],
  "best": {
    "params": {...},
    "score": 0.72,
    "metrics": {...}
  },
  "topResults": [...]
}
```

### `GET /api/optimization/promote`
Get strategy candidates and their promotion status.

### `POST /api/optimization/promote`
Manage strategy promotions.

**Body:**
```json
{
  "action": "auto|manual|reject|rollback",
  "candidateId": 1
}
```

### `POST /api/optimization/auto-promote`
Daily cron endpoint to check and auto-promote eligible strategies.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

## Database Schema (Supabase)

### Live Trading Tables
```sql
-- Single-row tables for state
CREATE TABLE portfolio (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);
CREATE TABLE config (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);
CREATE TABLE system_state (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);

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
```

### Paper Trading Tables
```sql
-- Mirror live trading tables for paper trading
CREATE TABLE paper_portfolio (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);
CREATE TABLE paper_config (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);
CREATE TABLE paper_state (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL);

CREATE TABLE paper_trades (
  id SERIAL PRIMARY KEY,
  trade_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  pair TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_eur DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  reason TEXT,
  strategy_id TEXT
);

CREATE TABLE paper_pnl_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  total_value_eur DECIMAL NOT NULL,
  strategy_id TEXT
);
```

### Backtesting & Optimization Tables
```sql
-- Candle cache for historical data
CREATE TABLE candle_cache (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  granularity TEXT NOT NULL,
  start_time TEXT NOT NULL,
  candles JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pair, granularity, start_time)
);

-- Backtest run history
CREATE TABLE backtest_runs (
  id SERIAL PRIMARY KEY,
  run_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  strategy_params JSONB NOT NULL,
  results JSONB,
  status TEXT DEFAULT 'running'
);

-- Strategy candidates for promotion
CREATE TABLE strategy_candidates (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  strategy_params JSONB NOT NULL,
  backtest_score DECIMAL,
  paper_score DECIMAL,
  paper_days_tested INT DEFAULT 0,
  status TEXT DEFAULT 'paper_testing',
  promoted_at TIMESTAMPTZ
);
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

## n8n Workflows

### Live Trading (Every 30 minutes)
```
Schedule Trigger → POST /api/trading/tick
                 → (Optional) POST /api/trading/analyze
```

### Paper Trading (Every 30 minutes)
```
Schedule Trigger → POST /api/paper-trading/tick
```

### Weekly Optimization (Sunday 02:00)
```
Schedule Trigger → POST /api/optimization/run
                   Body: {"mode": "reduced", "addCandidates": true}
```

### Daily Auto-Promote (06:00)
```
Schedule Trigger → POST /api/optimization/auto-promote
```

All endpoints require header: `Authorization: Bearer {{$env.CRON_SECRET}}`

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

### StrategyParams (Backtesting)
```typescript
interface StrategyParams {
  maxTradePercent: number;      // 0.10 - 0.30
  stopLossPercent: number;      // 0.03 - 0.10
  cooldownMinutes: number;      // 15 - 60
  rsiOversoldThreshold: number; // 25 - 35
  rsiOverboughtThreshold: number; // 65 - 75
  baseWeights: Record<string, number>;
}
```

### EvaluationMetrics
```typescript
interface EvaluationMetrics {
  totalReturn: number;     // (final - initial) / initial
  sharpeRatio: number;     // Risk-adjusted return
  maxDrawdown: number;     // Largest peak-to-trough decline
  winRate: number;         // Winning trades / total trades
  totalTrades: number;
  combinedScore: number;   // Weighted score (0-1)
}
```

### StrategyCandidate
```typescript
interface StrategyCandidate {
  id: number;
  createdAt: string;
  strategyParams: StrategyParams;
  backtestScore: number | null;
  paperScore: number | null;
  paperDaysTested: number;
  status: "paper_testing" | "promoted" | "rejected";
  promotedAt: string | null;
}
```

## Strategy Promotion Criteria

For a strategy to be automatically promoted from paper to live:

| Criterion | Threshold |
|-----------|-----------|
| Minimum backtest score | 60% |
| Minimum paper trading days | 7 days |
| Minimum paper score | 55% |
| Maximum paper drawdown | 8% |

**Combined Score Calculation:**
- Total Return: 30%
- Sharpe Ratio: 30%
- Max Drawdown: 25% (inverted)
- Win Rate: 15%

## Safety Features

1. **Drawdown Protection** - Pauses trading if portfolio drops below threshold
2. **Trade Cooldown** - Prevents overtrading with configurable wait period
3. **Max Trade Size** - Limits single trade to percentage of portfolio
4. **Min Trade Size** - Avoids dust trades below €5
5. **Paper Testing** - New strategies must prove themselves in paper trading before going live

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
- [x] Add backtesting capability
- [ ] Mobile-responsive dashboard
- [ ] Webhook notifications (Telegram/Discord)
- [x] Multiple strategy support (via paper trading candidates)
- [x] Paper trading (parallel to live)
- [x] Strategy optimization (grid search)
- [x] Automatic strategy promotion
- [ ] Backtesting UI in dashboard
- [ ] Paper trading performance comparison chart
