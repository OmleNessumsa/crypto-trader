"use client";

import { useEffect, useState } from "react";

export default function StatusBadge({
  enabled,
  lastTickTime,
  drawdownPaused,
}: {
  enabled: boolean;
  lastTickTime: string | null;
  drawdownPaused: boolean;
}) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    function update() {
      if (!lastTickTime) {
        setTimeAgo("Never");
        return;
      }
      const diff = Date.now() - new Date(lastTickTime).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setTimeAgo("Just now");
      else if (mins < 60) setTimeAgo(`${mins}m ago`);
      else setTimeAgo(`${Math.floor(mins / 60)}h ago`);
    }
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lastTickTime]);

  const isStale = lastTickTime
    ? Date.now() - new Date(lastTickTime).getTime() > 10 * 60 * 1000
    : true;

  let status: "active" | "warning" | "inactive";
  let label: string;

  if (drawdownPaused) {
    status = "warning";
    label = "Drawdown Paused";
  } else if (!enabled) {
    status = "inactive";
    label = "Paused";
  } else if (isStale) {
    status = "warning";
    label = "Stale";
  } else {
    status = "active";
    label = "Running";
  }

  const dotClass =
    status === "active"
      ? "status-dot-active"
      : status === "warning"
      ? "status-dot-warning"
      : "status-dot-inactive";

  const badgeClass =
    status === "active"
      ? "badge-emerald"
      : status === "warning"
      ? "badge-amber"
      : "badge-neutral";

  return (
    <div className="flex items-center gap-3">
      <div className={`badge ${badgeClass}`}>
        <div className={`status-dot ${dotClass} ${status === "active" ? "animate-pulse" : ""}`} />
        <span>{label}</span>
      </div>
      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
        {timeAgo}
      </span>
    </div>
  );
}
