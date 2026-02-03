export default function StatusBadge({
  enabled,
  lastTickTime,
  drawdownPaused,
}: {
  enabled: boolean;
  lastTickTime: string | null;
  drawdownPaused: boolean;
}) {
  const color = drawdownPaused
    ? "bg-yellow-400"
    : enabled
      ? "bg-emerald-400"
      : "bg-red-400";
  const label = drawdownPaused
    ? "Paused (Drawdown)"
    : enabled
      ? "Running"
      : "Stopped";

  function relative(ts: string | null) {
    if (!ts) return "never";
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} shadow-[0_0_6px] shadow-current`} />
      <span className="font-medium text-gray-100">{label}</span>
      <span className="text-gray-500">|</span>
      <span className="text-gray-400">Last tick: {relative(lastTickTime)}</span>
    </div>
  );
}
