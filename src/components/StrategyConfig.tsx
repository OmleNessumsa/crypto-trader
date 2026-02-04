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
    <div className="card p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trading Toggle */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Trading</p>
              <p className="text-xs text-white/40 mt-0.5">Enable auto trading</p>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !draft.enabled)}
              className={`toggle ${draft.enabled ? "active" : ""}`}
            />
          </div>
        </div>

        {/* AI Toggle */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">AI Analysis</p>
              <p className="text-xs text-white/40 mt-0.5">Claude recommendations</p>
            </div>
            <button
              type="button"
              onClick={() => set("aiEnabled", !draft.aiEnabled)}
              className={`toggle ${draft.aiEnabled ? "active" : ""}`}
            />
          </div>
        </div>

        {/* Max Trade % */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Max Trade</p>
              <p className="text-xs text-white/40 mt-0.5">Per transaction</p>
            </div>
            <span className="font-mono text-[#00ff88]">
              {(draft.maxTradePercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={draft.maxTradePercent * 100}
            onChange={(e) => set("maxTradePercent", Number(e.target.value) / 100)}
          />
        </div>

        {/* Stop Loss */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Stop Loss</p>
              <p className="text-xs text-white/40 mt-0.5">Exit threshold</p>
            </div>
            <span className="font-mono text-[#ff4757]">
              {(draft.stopLossPercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={draft.stopLossPercent * 100}
            onChange={(e) => set("stopLossPercent", Number(e.target.value) / 100)}
          />
        </div>

        {/* Max Drawdown */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Max Drawdown</p>
              <p className="text-xs text-white/40 mt-0.5">Pause threshold</p>
            </div>
            <span className="font-mono text-[#fbbf24]">
              {(draft.maxDrawdownPercent * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={draft.maxDrawdownPercent * 100}
            onChange={(e) => set("maxDrawdownPercent", Number(e.target.value) / 100)}
          />
        </div>

        {/* Cooldown */}
        <div className="bg-white/[0.02] rounded-2xl p-4">
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Cooldown</p>
              <p className="text-xs text-white/40 mt-0.5">Between trades</p>
            </div>
            <span className="font-mono text-white/60">
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
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
