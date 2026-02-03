export default function PnLChart({
  data,
}: {
  data: { timestamp: string; totalValueEur: number }[];
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-500">
        Not enough data
      </div>
    );
  }

  const values = data.map((d) => d.totalValueEur);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 600;
  const H = 200;
  const padX = 0;
  const padY = 10;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = padY + (1 - (d.totalValueEur - min) / range) * (H - padY * 2);
    return `${x},${y}`;
  });

  const first = values[0];
  const last = values[values.length - 1];
  const up = last >= first;
  const stroke = up ? "#34d399" : "#f87171";
  const fill = up ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)";

  const areaPoints = [`${padX},${H}`, ...points, `${W - padX},${H}`].join(" ");

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">P&L</h3>
        <div className="flex gap-4 font-mono text-xs text-gray-500">
          <span>Min: {"\u20AC"}{min.toFixed(2)}</span>
          <span>Max: {"\u20AC"}{max.toFixed(2)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <polygon points={areaPoints} fill={fill} />
        <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
