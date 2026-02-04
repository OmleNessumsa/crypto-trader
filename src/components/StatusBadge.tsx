export default function StatusBadge({
  enabled,
  lastTickTime,
  drawdownPaused,
}: {
  enabled: boolean;
  lastTickTime: string | null;
  drawdownPaused: boolean;
}) {
  function relative(ts: string | null) {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  const badgeClass = drawdownPaused
    ? "badge-warning"
    : enabled
      ? "badge-success"
      : "badge-danger";

  const label = drawdownPaused
    ? "Paused"
    : enabled
      ? "Running"
      : "Stopped";

  return (
    <div className="flex items-center gap-4">
      <div className={`badge ${badgeClass}`}>
        <span className={`w-2 h-2 rounded-full pulse-dot ${
          drawdownPaused ? "bg-[#fbbf24]" : enabled ? "bg-[#00ff88]" : "bg-[#ff4757]"
        }`} />
        {label}
      </div>
      <div className="text-sm text-white/40">
        <span>Last tick: </span>
        <span className="font-mono text-white/60">{relative(lastTickTime)}</span>
      </div>
    </div>
  );
}
