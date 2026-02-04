export default function StatusBadge({
  enabled,
  lastTickTime,
  drawdownPaused,
}: {
  enabled: boolean;
  lastTickTime: string | null;
  drawdownPaused: boolean;
}) {
  const status = drawdownPaused
    ? { color: "text-amber-400", bg: "bg-amber-400", label: "Paused", sublabel: "Drawdown" }
    : enabled
      ? { color: "text-emerald-400", bg: "bg-emerald-400", label: "Active", sublabel: "Trading" }
      : { color: "text-rose-400", bg: "bg-rose-400", label: "Stopped", sublabel: "Inactive" };

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

  return (
    <div className="flex items-center gap-4">
      {/* Status indicator */}
      <div className="flex items-center gap-3 rounded-full bg-[#0c1017] border border-slate-800/50 px-4 py-2">
        <div className="relative">
          <span
            className={`block h-2.5 w-2.5 rounded-full ${status.bg}`}
          />
          <span
            className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${status.bg} opacity-40 blur-sm`}
          />
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${status.color}`}>
            {status.label}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {status.sublabel}
          </span>
        </div>
      </div>

      {/* Last tick */}
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="w-4 h-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-slate-400">Last tick:</span>
        <span className="font-mono text-slate-300">{relative(lastTickTime)}</span>
      </div>
    </div>
  );
}
