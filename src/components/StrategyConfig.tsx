"use client";

import { useState } from "react";
import type { TradingConfig } from "@/lib/store";

export default function StrategyConfig({
  config,
  onSave,
}: {
  config: TradingConfig;
  onSave: (config: TradingConfig) => void;
}) {
  const [draft, setDraft] = useState<TradingConfig>(config);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TradingConfig>(key: K, value: TradingConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    onSave(draft);
    setTimeout(() => setSaving(false), 600);
  }

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Strategy Configuration
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Trading Enabled Toggle */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Trading</p>
              <p className="text-xs text-slate-500 mt-0.5">Enable automated trading</p>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !draft.enabled)}
              className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
                draft.enabled
                  ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                  draft.enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* AI Enabled Toggle */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">AI Analysis</p>
              <p className="text-xs text-slate-500 mt-0.5">Claude-powered insights</p>
            </div>
            <button
              type="button"
              onClick={() => set("aiEnabled", !draft.aiEnabled)}
              className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
                draft.aiEnabled
                  ? "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                  : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                  draft.aiEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Max Trade % */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Max Trade Size</p>
              <p className="text-xs text-slate-500 mt-0.5">Per-trade limit</p>
            </div>
            <span className="font-mono text-lg font-semibold text-cyan-400">
              {(draft.maxTradePercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={draft.maxTradePercent * 100}
            onChange={(e) => set("maxTradePercent", Number(e.target.value) / 100)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Stop Loss % */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Stop Loss</p>
              <p className="text-xs text-slate-500 mt-0.5">Exit threshold</p>
            </div>
            <span className="font-mono text-lg font-semibold text-rose-400">
              {(draft.stopLossPercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={draft.stopLossPercent * 100}
            onChange={(e) => set("stopLossPercent", Number(e.target.value) / 100)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        {/* Max Drawdown % */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Max Drawdown</p>
              <p className="text-xs text-slate-500 mt-0.5">Pause threshold</p>
            </div>
            <span className="font-mono text-lg font-semibold text-amber-400">
              {(draft.maxDrawdownPercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={draft.maxDrawdownPercent * 100}
            onChange={(e) => set("maxDrawdownPercent", Number(e.target.value) / 100)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Cooldown Minutes */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Cooldown</p>
              <p className="text-xs text-slate-500 mt-0.5">Between trades</p>
            </div>
            <span className="font-mono text-lg font-semibold text-slate-300">
              {draft.cooldownMinutes}m
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={draft.cooldownMinutes}
            onChange={(e) => set("cooldownMinutes", Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="relative z-10 flex items-center gap-2">
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
