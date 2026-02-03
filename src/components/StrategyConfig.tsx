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
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Strategy Config</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Enabled */}
        <label className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
          <span className="text-sm text-gray-300">Enabled</span>
          <button
            type="button"
            onClick={() => set("enabled", !draft.enabled)}
            className={`relative h-6 w-11 rounded-full transition ${draft.enabled ? "bg-emerald-500" : "bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft.enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>

        {/* AI Enabled */}
        <label className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2">
          <span className="text-sm text-gray-300">AI Enabled</span>
          <button
            type="button"
            onClick={() => set("aiEnabled", !draft.aiEnabled)}
            className={`relative h-6 w-11 rounded-full transition ${draft.aiEnabled ? "bg-emerald-500" : "bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft.aiEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>

        {/* Max Trade % */}
        <div className="rounded-lg bg-gray-800 px-3 py-2">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-300">Max Trade %</span>
            <span className="font-mono text-gray-400">{(draft.maxTradePercent * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={draft.maxTradePercent * 100}
            onChange={(e) => set("maxTradePercent", Number(e.target.value) / 100)}
            className="w-full accent-emerald-500"
          />
        </div>

        {/* Stop Loss % */}
        <div className="rounded-lg bg-gray-800 px-3 py-2">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-300">Stop Loss %</span>
            <span className="font-mono text-gray-400">{(draft.stopLossPercent * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={draft.stopLossPercent * 100}
            onChange={(e) => set("stopLossPercent", Number(e.target.value) / 100)}
            className="w-full accent-emerald-500"
          />
        </div>

        {/* Max Drawdown % */}
        <div className="rounded-lg bg-gray-800 px-3 py-2">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-300">Max Drawdown %</span>
            <span className="font-mono text-gray-400">{(draft.maxDrawdownPercent * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={draft.maxDrawdownPercent * 100}
            onChange={(e) => set("maxDrawdownPercent", Number(e.target.value) / 100)}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>
    </div>
  );
}
