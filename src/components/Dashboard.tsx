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
        if (res.ok) setTrades(await res.json());
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
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const portfolio = status?.portfolio;
  const config = status?.config;
  const state = status?.state;
  const pnl = status?.pnl ?? [];
  const pairs = config?.pairs ?? ["BTC-EUR", "ETH-EUR", "SOL-EUR"];

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Crypto Trading Dashboard</h1>
        <StatusBadge
          enabled={config?.enabled ?? false}
          lastTickTime={state?.lastTickTime ?? null}
          drawdownPaused={portfolio?.drawdownPaused ?? false}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Total Value */}
      {portfolio && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-sm text-gray-500">Total Value</span>
          <div className="text-3xl font-bold text-gray-100">
            {"\u20AC"}{portfolio.totalValueEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Coin Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <PortfolioChart weights={portfolio?.weights ?? {}} />
        <PnLChart data={pnl} />
      </div>

      {/* Trade History */}
      <div className="mb-6">
        <TradeHistory trades={trades} />
      </div>

      {/* Collapsible Config */}
      <div>
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="mb-2 flex items-center gap-2 text-sm text-gray-400 transition hover:text-gray-200"
        >
          <span className={`inline-block transition-transform ${configOpen ? "rotate-90" : ""}`}>&#9654;</span>
          Strategy Configuration
        </button>
        {configOpen && config && (
          <StrategyConfig config={config} onSave={handleSaveConfig} />
        )}
      </div>
    </div>
  );
}
