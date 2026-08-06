import { useMemo } from "react";
import type { ReconstructionResult } from "../../types/path";

interface PathChartProps {
  reconstruction: ReconstructionResult;
}

export function PathChart({ reconstruction }: PathChartProps) {
  const { pathD, viewBox, minPrice, maxPrice } = useMemo(() => {
    const steps = reconstruction.steps;
    const allPrices = [reconstruction.anchorValue, ...steps.map((s) => s.impliedPrice)];
    const minP = Math.min(...allPrices) * 0.95;
    const maxP = Math.max(...allPrices) * 1.05;
    const range = maxP - minP || 1;

    const width = 600;
    const height = 200;
    const padding = 10;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const points = allPrices.map((price, i) => {
      const x = padding + (i / (allPrices.length - 1)) * plotW;
      const y = padding + plotH - ((price - minP) / range) * plotH;
      return `${x},${y}`;
    });

    const d = `M${points.join(" L")}`;

    return { pathD: d, viewBox: `0 0 ${width} ${height}`, minPrice: minP, maxPrice: maxP };
  }, [reconstruction]);

  return (
    <div className="w-full">
      <svg viewBox={viewBox} className="w-full h-48" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = 10 + (200 - 20) * (1 - pct);
          const price = minPrice + (maxPrice - minPrice) * pct;
          return (
            <g key={pct}>
              <line
                x1={10} y1={y} x2={590} y2={y}
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-800"
                strokeWidth={0.5}
              />
              <text
                x={8} y={y + 3}
                textAnchor="end"
                className="text-[8px] fill-gray-400 dark:fill-gray-600"
              >
                ${price.toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Anchor line */}
        <line
          x1={10} y1={200 - 20 - ((reconstruction.anchorValue - minPrice) / (maxPrice - minPrice)) * (200 - 20)}
          x2={590} y2={200 - 20 - ((reconstruction.anchorValue - minPrice) / (maxPrice - minPrice)) * (200 - 20)}
          stroke="currentColor"
          className="text-blue-400 dark:text-blue-600"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        {/* Path */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          className="text-blue-600 dark:text-blue-400"
          strokeWidth={2}
        />
        {/* Points */}
        {reconstruction.steps.map((step, i) => {
          const allPrices = [reconstruction.anchorValue, ...reconstruction.steps.map((s) => s.impliedPrice)];
          const minP = Math.min(...allPrices) * 0.95;
          const maxP = Math.max(...allPrices) * 1.05;
          const range = maxP - minP || 1;
          const x = 10 + ((i + 1) / (allPrices.length - 1)) * 580;
          const y = 10 + (200 - 20) * (1 - (step.impliedPrice - minP) / range);
          return (
            <circle
              key={step.stepNumber}
              cx={x} cy={y} r={2.5}
              className="fill-blue-600 dark:fill-blue-400"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 mt-1">
        <span>{new Date(reconstruction.anchorAt).toLocaleDateString()}</span>
        <span>{new Date(reconstruction.steps[reconstruction.steps.length - 1].validAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}