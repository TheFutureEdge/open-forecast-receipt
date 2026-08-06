import { useMemo } from "react";
import type { OfrDocument } from "../../types/ofr";
import { reconstructPath } from "../../lib/path/reconstruct";
import { PathChart } from "./PathChart";
import { ReconstructionTable } from "./ReconstructionTable";

interface PathReconstructionProps {
  document: OfrDocument;
}

export function PathReconstruction({ document }: PathReconstructionProps) {
  const forecast = document.receiptPayload.forecast;
  const anchorValueMicros = forecast.anchor?.valueScaled ?? 0;
  const anchorAt = forecast.temporal.anchorAt;
  const cadenceMonths = forecast.temporal.cadence.value;
  const pointCount = forecast.temporal.cadence.count;
  const stepReturnBps = forecast.prediction.points.map((p) => p.value).join(",");

  const reconstruction = useMemo(() => {
    try {
      return reconstructPath(
        anchorValueMicros,
        anchorAt,
        cadenceMonths,
        pointCount,
        stepReturnBps
      );
    } catch (e) {
      return null;
    }
  }, [anchorValueMicros, anchorAt, cadenceMonths, pointCount, stepReturnBps]);

  if (!reconstruction) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
        Failed to reconstruct price path. Check the stepReturnBps data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
        Price Path Reconstruction
      </h3>
      <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <PathChart reconstruction={reconstruction} />
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ReconstructionTable reconstruction={reconstruction} />
      </div>
    </div>
  );
}
