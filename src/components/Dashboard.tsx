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
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Connection Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={fetchStatus}
            className="mt-6 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition"
          >
            Try Again
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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              Crypto Trader
            </h1>
            <p className="text-slate-500 text-sm mt-1">Automated portfolio rebalancing</p>
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
        <div className="mb-6 glass-card border-rose-500/30 bg-rose-500/5 p-4 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-rose-300">{error}</span>
        </div>
      )}

      {/* Portfolio Value & EUR Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-fade-in animation-delay-100">
        {/* Total Portfolio Value */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-sm text-slate-400 uppercase tracking-wider">Total Value</span>
            </div>
            <div className="text-4xl font-bold text-slate-100 font-mono">
              €{(portfolio?.totalValueEur ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {portfolio?.peakValueEur && portfolio.peakValueEur > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                Peak: €{portfolio.peakValueEur.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {/* EUR Balance Card */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-slate-400 uppercase tracking-wider">EUR Balance</span>
            </div>
            <div className="text-4xl font-bold text-slate-100 font-mono">
              €{eurBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Available for trading
            </div>
          </div>
        </div>
      </div>

      {/* Coin Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in animation-delay-200">
        {pairs.map((pair) => (
          <CoinCard
            key={pair}
            pair={pair}
            price={0}
            weight={portfolio?.weights[pair] ?? 0}
            targetWeight={config?.baseWeights[pair] ?? 0.333}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in animation-delay-300">
        <PortfolioChart weights={portfolio?.weights ?? {}} />
        <PnLChart data={pnl} />
      </div>

      {/* Trade History */}
      <div className="mb-6 animate-fade-in animation-delay-400">
        <TradeHistory trades={trades} />
      </div>

      {/* Strategy Config Toggle */}
      <div className="animate-fade-in animation-delay-500">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 text-sm text-slate-300 hover:bg-slate-800 hover:border-slate-600/50 transition-all duration-200 group"
        >
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${configOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Strategy Configuration</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
            config?.enabled
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-slate-700 text-slate-400"
          }`}>
            {config?.enabled ? "Active" : "Inactive"}
          </span>
        </button>

        {configOpen && config && (
          <div className="mt-4">
            <StrategyConfig config={config} onSave={handleSaveConfig} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-800/50 text-center text-xs text-slate-600">
        Crypto Trader • Powered by Claude AI & Coinbase
      </footer>
    </div>
  );
}
