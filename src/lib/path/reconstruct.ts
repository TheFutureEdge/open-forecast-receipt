import type { ReconstructionResult, ReconstructionStep } from "../../types/path";
import { parseStepReturnBps, bpsToPercent, cumulativeReturnBps } from "../convert/basisPoints";

/**
 * Reconstruct the market price path from an OFR document's anchor value,
 * cadence, and stepReturnBps.
 *
 * Uses calendar-month UTC arithmetic (not 30-day intervals).
 * Each step N's validAt = anchorAt + (N × cadenceMonths) in calendar months.
 * Step N's impliedPrice = previousPrice × (1 + stepReturnBps / 10000).
 */

function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function reconstructPath(
  anchorValueMicros: number,
  anchorAt: string,
  cadenceMonths: number,
  pointCount: number,
  stepReturnBpsRaw: string
): ReconstructionResult {
  const steps = parseStepReturnBps(stepReturnBpsRaw);

  if (steps.length !== pointCount) {
    throw new Error(
      `pointCount (${pointCount}) does not match stepReturnBps length (${steps.length})`
    );
  }

  const anchorDate = new Date(anchorAt);
  const anchorValue = anchorValueMicros / 1000000;

  let cumulativeBps = 0;
  const reconstructionSteps: ReconstructionStep[] = [];
  let currentPrice = anchorValue;

  for (let i = 0; i < steps.length; i++) {
    const stepBps = steps[i];
    const stepNum = i + 1;
    const validAt = addCalendarMonths(anchorDate, stepNum * cadenceMonths);

    currentPrice = currentPrice * (1 + stepBps / 10000);
    cumulativeBps = cumulativeReturnBps(steps.slice(0, i + 1));

    const cumulativePercent = cumulativeBps / 100;

    reconstructionSteps.push({
      stepNumber: stepNum,
      validAt: validAt.toISOString(),
      stepReturnBps: stepBps,
      stepReturnPercent: bpsToPercent(stepBps),
      cumulativeReturnPercent: `${cumulativePercent > 0 ? "+" : ""}${cumulativePercent.toFixed(2)}%`,
      impliedPrice: Math.round(currentPrice * 10000) / 10000,
    });
  }

  const finalCumulativeBps = cumulativeReturnBps(steps);
  const terminalReturnPercent = finalCumulativeBps / 100;

  return {
    anchorValue,
    anchorAt,
    cadenceMonths,
    pointCount,
    terminalPrice: reconstructionSteps[reconstructionSteps.length - 1].impliedPrice,
    terminalReturnPercent: `${terminalReturnPercent > 0 ? "+" : ""}${terminalReturnPercent.toFixed(2)}%`,
    steps: reconstructionSteps,
  };
}