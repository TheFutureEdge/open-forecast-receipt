/**
 * Basis points (bps) ↔ percent conversion utilities.
 * 1 bps = 0.01% (one one-hundredth of a percent).
 * Used for stepReturnBps, which is stored as a comma-separated string of integers.
 */

/**
 * Convert basis points to a signed percentage string.
 * e.g. -400 → "-4.00%", 200 → "+2.00%", 0 → "0.00%"
 */
export function bpsToPercent(bps: number): string {
  const percent = bps / 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Convert a percentage string or number to basis points.
 * e.g. "-4.00%" → -400, "2.00%" → 200
 */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Parse a comma-separated stepReturnBps string into an array of numbers.
 */
export function parseStepReturnBps(raw: string): number[] {
  return raw.split(",").map((s) => parseInt(s.trim(), 10));
}

/**
 * Compute cumulative return in basis points from an array of step returns.
 * Cumulative return is (product of (1 + step/10000)) - 1, in bps.
 */
export function cumulativeReturnBps(steps: number[]): number {
  const product = steps.reduce((acc, bps) => acc * (1 + bps / 10000), 1);
  return Math.round((product - 1) * 10000);
}