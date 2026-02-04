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
    <div className="card p-8 sm:p-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trading Toggle */}
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Trading</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Enable auto trading</p>
            </div>
            <button
              type="button"
              onClick={() => set("enabled", !draft.enabled)}
              className={`toggle ${draft.enabled ? "active" : ""}`}
            />
          </div>
        </div>

        {/* AI Toggle */}
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">AI Analysis</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Claude recommendations</p>
            </div>
            <button
              type="button"
              onClick={() => set("aiEnabled", !draft.aiEnabled)}
              className={`toggle ${draft.aiEnabled ? "active" : ""}`}
            />
          </div>
        </div>

        {/* Max Trade % */}
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Max Trade</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Per transaction</p>
            </div>
            <span className="font-mono text-sm" style={{ color: "var(--accent-emerald)" }}>
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
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Stop Loss</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Exit threshold</p>
            </div>
            <span className="font-mono text-sm" style={{ color: "var(--accent-red)" }}>
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
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Max Drawdown</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Pause threshold</p>
            </div>
            <span className="font-mono text-sm" style={{ color: "var(--accent-amber)" }}>
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
        <div className="p-6 rounded-xl" style={{ background: "var(--bg-tertiary)" }}>
          <div className="flex justify-between mb-3">
            <div>
              <p className="font-medium text-sm">Cooldown</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Between trades</p>
            </div>
            <span className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
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

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary text-sm"
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
