import type { PublicForecasterCoverage, PublicForecasterRecord, PublicForecastRecord } from "../library/types";

function modeFromDescription(description: string): string | null {
  const mode = description.split("·").at(-1)?.trim().toUpperCase();
  return mode === "RESEARCHER" || mode === "THINKER" ? mode : null;
}

export function buildForecasterCoverage(
  forecasters: PublicForecasterRecord[],
  forecasts: PublicForecastRecord[],
): Map<string, PublicForecasterCoverage> {
  const recordsByForecaster = new Map<string, PublicForecastRecord[]>();
  for (const forecast of forecasts) {
    const records = recordsByForecaster.get(forecast.forecasterId) || [];
    records.push(forecast);
    recordsByForecaster.set(forecast.forecasterId, records);
  }

  return new Map(forecasters.map((forecaster) => {
    const records = recordsByForecaster.get(forecaster.forecasterId) || [];
    return [forecaster.forecasterId, {
      forecasts: records.length,
      entities: new Set(records.map((record) => record.entityId)).size,
      modes: [...new Set(records
        .map((record) => record.forecasterMode || modeFromDescription(record.forecaster.description))
        .filter((mode): mode is string => Boolean(mode)))].sort(),
      publishedSubjectCategories: [...new Set(records
        .map((record) => record.subjectCategory)
        .filter((value): value is string => Boolean(value)))].sort(),
      proofSelected: records.filter((record) => record.showcaseSelected).length,
      proofVerified: records.filter((record) => record.chainStatus === "verified").length,
      taskConfigurations: new Set(records.map((record) => record.taskConfigurationId).filter(Boolean)).size
        || forecaster.taskConfigurationIds?.length || 0,
      subjectAssignments: new Set(records.map((record) => record.subjectAssignmentId).filter(Boolean)).size
        || forecaster.subjectAssignmentIds?.length || 0,
    } satisfies PublicForecasterCoverage] as const;
  }));
}

export function summarizeForecasts(forecasts: PublicForecastRecord[]) {
  return {
    forecasts: forecasts.length,
    entities: new Set(forecasts.map((forecast) => forecast.entityId)).size,
    proofVerified: forecasts.filter((forecast) => forecast.chainStatus === "verified").length,
  };
}
