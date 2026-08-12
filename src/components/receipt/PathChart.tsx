import { useId, useMemo } from "react";
import type { ReconstructionResult } from "../../types/path";

interface PathChartProps {
  reconstruction: ReconstructionResult;
}

export function PathChart({ reconstruction }: PathChartProps) {
  const gradientId = useId().replaceAll(":", "");
  const chart = useMemo(() => {
    const prices = [reconstruction.anchorValue, ...reconstruction.steps.map((step) => step.impliedPrice)];
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const spread = Math.max(rawMax - rawMin, rawMax * 0.04, 1);
    const minPrice = Math.max(0, rawMin - spread * 0.22);
    const maxPrice = rawMax + spread * 0.22;
    const range = maxPrice - minPrice;
    const width = 760;
    const height = 250;
    const padding = { left: 48, right: 18, top: 14, bottom: 22 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const points = prices.map((price, index) => ({
      x: padding.left + (index / Math.max(prices.length - 1, 1)) * plotWidth,
      y: padding.top + plotHeight - ((price - minPrice) / range) * plotHeight,
      price,
    }));
    const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
    const area = `${line} L${points.at(-1)!.x},${padding.top + plotHeight} L${points[0].x},${padding.top + plotHeight} Z`;
    return { minPrice, maxPrice, width, height, padding, plotWidth, plotHeight, points, line, area };
  }, [reconstruction]);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-52 w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Reconstructed forecast price path">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((position) => {
          const y = chart.padding.top + chart.plotHeight * (1 - position);
          const price = chart.minPrice + (chart.maxPrice - chart.minPrice) * position;
          return (
            <g key={position}>
              <line x1={chart.padding.left} y1={y} x2={chart.padding.left + chart.plotWidth} y2={y} stroke="#dbe3ef" strokeWidth="1" />
              <text x={chart.padding.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">${price.toFixed(0)}</text>
            </g>
          );
        })}
        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path d={chart.line} fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {chart.points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={index === chart.points.length - 1 ? 4 : 2.5} fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between px-12 text-[10px] font-medium text-slate-400">
        <span>{new Date(reconstruction.anchorAt).toLocaleDateString()}</span>
        <span>{new Date(reconstruction.steps.at(-1)!.validAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
