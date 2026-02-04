-- Migration: Backtesting & Paper Trading Tables
-- Run this migration in Supabase SQL Editor

-- Paper trading tables (mirror live trading tables)
CREATE TABLE IF NOT EXISTS paper_portfolio (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_config (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_state (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_trades (
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

CREATE TABLE IF NOT EXISTS paper_pnl_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  total_value_eur DECIMAL NOT NULL,
  strategy_id TEXT
);

-- Backtest & optimization tables
CREATE TABLE IF NOT EXISTS candle_cache (
  id SERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  granularity TEXT NOT NULL,
  start_time TEXT NOT NULL,
  candles JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pair, granularity, start_time)
);

CREATE TABLE IF NOT EXISTS backtest_runs (
  id SERIAL PRIMARY KEY,
  run_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  strategy_params JSONB NOT NULL,
  results JSONB,
  status TEXT DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS strategy_candidates (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  strategy_params JSONB NOT NULL,
  backtest_score DECIMAL,
  paper_score DECIMAL,
  paper_days_tested INT DEFAULT 0,
  status TEXT DEFAULT 'paper_testing',
  promoted_at TIMESTAMPTZ
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_timestamp ON paper_trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_paper_trades_strategy ON paper_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_paper_pnl_timestamp ON paper_pnl_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_paper_pnl_strategy ON paper_pnl_history(strategy_id);
CREATE INDEX IF NOT EXISTS idx_candle_cache_lookup ON candle_cache(pair, granularity, start_time);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON backtest_runs(status);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_started ON backtest_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_candidates_status ON strategy_candidates(status);
