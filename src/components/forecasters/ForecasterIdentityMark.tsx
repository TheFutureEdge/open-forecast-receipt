import { Buildings, Robot, UserCircle } from "@phosphor-icons/react";

interface ForecasterIdentityMarkProps {
  type?: string;
  label?: string;
  className?: string;
}

/**
 * A neutral, type-aware identity mark. Forecast records do not own portraits;
 * optional governed media belongs to the separate forecaster profile.
 */
export function ForecasterIdentityMark({ type, label, className = "size-10" }: ForecasterIdentityMarkProps) {
  const normalized = String(type || "ai_model").toLowerCase();
  const Icon = normalized.includes("human") || normalized === "person"
    ? UserCircle
    : normalized.includes("organization") || normalized.includes("team")
      ? Buildings
      : Robot;

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 text-violet-700 dark:border-violet-900 dark:from-violet-950/60 dark:to-blue-950/50 dark:text-violet-300 ${className}`}
      role="img"
      aria-label={`${label || "Forecaster"} identity mark`}
    >
      <Icon size="48%" weight="duotone" aria-hidden="true" />
    </span>
  );
}
