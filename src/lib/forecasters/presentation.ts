import type {
  OfrForecast,
  OfrForecastReview,
  OfrForecastReviewer,
} from "../../types/ofr";

export interface ForecasterPresentation {
  displayName: string;
  description: string;
  typeLabel: string;
  implementationLabel: string;
  modelLabel: string | null;
  architectureAuthors: string[];
  reviewStatusLabel: string;
  reviewers: OfrForecastReviewer[];
}

const HUMAN_TYPES = new Set(["human", "person", "individual"]);

function normalizedType(value: string): string {
  return value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function isHumanForecaster(type: string): boolean {
  return HUMAN_TYPES.has(normalizedType(type));
}

function forecasterTypeLabel(type: string): string {
  const normalized = normalizedType(type);
  if (normalized.includes("ai")) return "AI forecaster";
  if (normalized.includes("ensemble")) return "Ensemble forecaster";
  if (normalized.includes("hybrid")) return "Hybrid forecaster";
  if (normalized.includes("algorithm") || normalized.includes("model")) return "Model forecaster";
  if (normalized.includes("organization")) return "Organization forecaster";
  if (isHumanForecaster(type)) return "Human forecaster";
  return `${normalized.replaceAll("_", " ")} forecaster`;
}

function displayName(name: string, type: string): string {
  if (isHumanForecaster(type)) return name;
  const normalized = normalizedType(type);
  const suffix = normalized.includes("ai") ? "AI" : normalized.includes("algorithm") || normalized.includes("model") ? "Model" : "Forecaster";
  return new RegExp(`\\b${suffix}$`, "i").test(name) ? name : `${name} ${suffix}`;
}

function legacyReview(forecast: OfrForecast): OfrForecastReview {
  const status = typeof forecast.methodology?.humanReviewStatus === "string"
    ? forecast.methodology.humanReviewStatus
    : "unknown";
  return {
    status: status === "not_reviewed" ? "not_reviewed" : "unknown",
    reviewers: [],
  };
}

function reviewStatusLabel(review: OfrForecastReview): string {
  if (review.status === "reviewed") {
    const humanCount = review.reviewers.filter((reviewer) => isHumanForecaster(reviewer.type)).length;
    if (humanCount > 0) return `Human reviewed · ${review.reviewers.length} reviewer${review.reviewers.length === 1 ? "" : "s"}`;
    return `Reviewed · ${review.reviewers.length} reviewer${review.reviewers.length === 1 ? "" : "s"}`;
  }
  if (review.status === "partially_reviewed") return "Partially reviewed";
  if (review.status === "not_reviewed") return "Not reviewed";
  return "Review not recorded";
}

/** Normalize immutable v0.1 forecasters into the generalized Library view. */
export function presentForecaster(forecast: OfrForecast): ForecasterPresentation {
  const forecaster = forecast.forecaster;
  const model = forecaster.model;
  const review = forecast.review ?? legacyReview(forecast);
  const legacyDescription = [forecaster.role, forecaster.mode].filter(Boolean).join(" · ");
  const modelLabel = model ? `${model.name}${model.provider ? ` by ${model.provider}` : ""}` : null;

  return {
    displayName: displayName(forecaster.name, forecaster.type),
    description: forecaster.description || legacyDescription || "Independent forecaster",
    typeLabel: forecasterTypeLabel(forecaster.type),
    implementationLabel: modelLabel || forecasterTypeLabel(forecaster.type),
    modelLabel,
    architectureAuthors: (forecaster.architectureAuthors ?? []).map((author) => {
      const organization = author.organization ? ` · ${author.organization}` : "";
      return `${author.name}${organization} · ${author.contribution}`;
    }),
    reviewStatusLabel: reviewStatusLabel(review),
    reviewers: review.reviewers.slice(0, 10),
  };
}
