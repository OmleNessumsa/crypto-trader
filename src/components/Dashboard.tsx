"use client";

import { useEffect, useState, useCallback } from "react";
import type { TradingConfig, PortfolioState, TradeRecord, SystemState, PnLPoint } from "@/lib/store";
import StatusBadge from "./StatusBadge";
import CoinCard from "./CoinCard";
import PortfolioChart from "./PortfolioChart";
import PnLChart from "./PnLChart";
import TradeHistory from "./TradeHistory";
import StrategyConfig from "./StrategyConfig";

interface StatusResponse {
  portfolio: PortfolioState | null;
  config: TradingConfig;
  state: SystemState;
  pnl: PnLPoint[];
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/trading/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      setStatus(await res.json());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchStatus();
      try {
        const res = await fetch("/api/trading/history");
        if (res.ok) {
          const data = await res.json();
          setTrades(data.trades ?? []);
        }
      } catch {}
      setLoading(false);
    }
    init();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleSaveConfig(config: TradingConfig) {
    try {
      await fetch("/api/trading/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      await fetchStatus();
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner" />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-sm text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-red-dim)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent-red)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="heading-md mb-2">Connection Error</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
          <button onClick={fetchStatus} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const portfolio = status?.portfolio;
  const config = status?.config;
  const state = status?.state;
  const pnl = status?.pnl ?? [];
  const pairs = config?.pairs ?? ["BTC-EUR", "ETH-EUR", "SOL-EUR"];
  const eurBalance = portfolio?.balances?.["EUR"] ?? 0;
  const totalValue = portfolio?.totalValueEur ?? eurBalance;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-cyan))' }}
            >
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Crypto Trader</h1>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Automated Portfolio</p>
            </div>
          </div>
          <StatusBadge
            enabled={config?.enabled ?? false}
            lastTickTime={state?.lastTickTime ?? null}
            drawdownPaused={portfolio?.drawdownPaused ?? false}
          />
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          className="mb-6 card p-4 flex items-center gap-3 animate-fade-up"
          style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'var(--accent-red-dim)' }}
        >
          <div className="status-dot" style={{ background: 'var(--accent-red)' }} />
          <span className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 animate-fade-up animate-delay-1">
        {/* Total Portfolio */}
        <div className="card card-glow-emerald p-8 sm:p-10">
          <p className="label mb-4">Total Portfolio Value</p>
          <p className="stat-value" style={{ color: 'var(--text-primary)' }}>
            €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {portfolio?.peakValueEur && portfolio.peakValueEur > totalValue && (
            <p className="text-xs font-mono mt-4" style={{ color: 'var(--text-muted)' }}>
              ATH €{portfolio.peakValueEur.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* EUR Balance */}
        <div className="card card-glow-cyan p-8 sm:p-10">
          <p className="label mb-4">Available EUR</p>
          <p className="stat-value" style={{ color: 'var(--text-primary)' }}>
            €{eurBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Ready for trading
          </p>
        </div>
      </div>

      {/* Coin Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 animate-fade-up animate-delay-2">
        {pairs.map((pair) => (
          <CoinCard
            key={pair}
            pair={pair}
            balance={portfolio?.balances?.[pair.split("-")[0]] ?? 0}
            weight={portfolio?.weights?.[pair] ?? 0}
            targetWeight={config?.baseWeights?.[pair] ?? 0.333}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 animate-fade-up animate-delay-3">
        <PortfolioChart weights={portfolio?.weights ?? {}} />
        <PnLChart data={pnl} />
      </div>

      {/* Trade History */}
      <div className="mb-10 animate-fade-up animate-delay-4">
        <TradeHistory trades={trades} />
      </div>

      {/* Settings Accordion */}
      <div className="animate-fade-up animate-delay-4">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full card card-interactive p-6 sm:p-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium text-sm">Strategy Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${config?.enabled ? 'badge-emerald' : 'badge-neutral'}`}>
              {config?.enabled ? 'Active' : 'Paused'}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${configOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {configOpen && config && (
          <div className="mt-4">
            <StrategyConfig config={config} onSave={handleSaveConfig} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pb-6 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Powered by Claude AI & Coinbase
        </p>
      </footer>
    </div>
  );
}
