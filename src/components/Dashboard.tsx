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
          <div className="w-12 h-12 border-2 border-[#00ff88]/30 border-t-[#00ff88] rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card p-8 max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#ff4757]/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#ff4757]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Connection Error</h2>
          <p className="text-white/50 text-sm mb-6">{error}</p>
          <button onClick={fetchStatus} className="btn-primary text-sm">
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
  const totalValue = portfolio?.totalValueEur ?? 0;

  return (
    <div className="relative z-10 min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Crypto Trader</h1>
              <p className="text-white/40 text-sm">Automated Portfolio Management</p>
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
        <div className="mb-6 card border-[#ff4757]/20 bg-[#ff4757]/5 p-4 flex items-center gap-3 fade-in">
          <div className="w-2 h-2 rounded-full bg-[#ff4757]" />
          <span className="text-sm text-[#ff4757]">{error}</span>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 fade-in delay-1">
        {/* Total Value */}
        <div className="card card-glow-green p-6 overflow-hidden">
          <div className="stat-glow bg-[#00ff88] top-0 right-0" />
          <div className="relative">
            <p className="text-white/40 text-sm mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold font-mono tracking-tight">
              €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {portfolio?.peakValueEur && portfolio.peakValueEur > totalValue && (
              <p className="text-white/30 text-xs mt-2 font-mono">
                ATH: €{portfolio.peakValueEur.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        {/* EUR Balance */}
        <div className="card card-glow-blue p-6 overflow-hidden">
          <div className="stat-glow bg-[#00d4ff] top-0 right-0" />
          <div className="relative">
            <p className="text-white/40 text-sm mb-1">Available EUR</p>
            <p className="text-4xl font-bold font-mono tracking-tight">
              €{eurBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-white/30 text-xs mt-2">Ready for trading</p>
          </div>
        </div>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 fade-in delay-2">
        {pairs.map((pair, i) => (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 fade-in delay-3">
        <PortfolioChart weights={portfolio?.weights ?? {}} />
        <PnLChart data={pnl} />
      </div>

      {/* Trade History */}
      <div className="mb-8 fade-in delay-4">
        <TradeHistory trades={trades} />
      </div>

      {/* Config Section */}
      <div className="fade-in delay-5">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full card p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Strategy Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${config?.enabled ? 'badge-success' : 'badge-neutral'}`}>
              {config?.enabled ? 'Active' : 'Inactive'}
            </span>
            <svg
              className={`w-5 h-5 text-white/40 transition-transform ${configOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
      <footer className="mt-16 pb-8 text-center">
        <p className="text-white/20 text-xs">
          Powered by Claude AI & Coinbase
        </p>
      </footer>
    </div>
  );
}
