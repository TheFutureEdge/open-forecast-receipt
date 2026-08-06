import type { DataStatus, IntegrityStatus, ChainStatus, CoverageStatus } from "../../types/verification";

type BadgeType = "dataStatus" | "integrityStatus" | "chainStatus" | "coverageStatus";

interface StatusBadgeProps {
  type: BadgeType;
  value: DataStatus | IntegrityStatus | ChainStatus | CoverageStatus;
  label?: string;
}

function getBadgeColor(value: string, type: BadgeType): string {
  // Receipt-level statuses
  if (type === "dataStatus") {
    switch (value) {
      case "loaded": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "fixture_pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "invalid": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    }
  }
  if (type === "integrityStatus") {
    switch (value) {
      case "pass": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "fail": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      case "not_checked": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  }
  if (type === "chainStatus") {
    switch (value) {
      case "verified": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "not_issued": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "revoked": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "unavailable": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    }
  }
  // Asset-level coverageStatus
  if (type === "coverageStatus") {
    switch (value) {
      case "complete": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "partial": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "none": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function getBadgeLabel(type: BadgeType, value: string): string {
  switch (`${type}:${value}`) {
    // Data status
    case "dataStatus:loaded": return "Loaded";
    case "dataStatus:fixture_pending": return "Data Pending";
    case "dataStatus:invalid": return "Invalid";
    // Integrity status
    case "integrityStatus:pass": return "Integrity Passed";
    case "integrityStatus:fail": return "Integrity FAIL";
    case "integrityStatus:not_checked": return "Not Checked";
    // Chain status
    case "chainStatus:verified": return "Onchain Verified";
    case "chainStatus:not_issued": return "Not Issued Onchain";
    case "chainStatus:revoked": return "Attestation Revoked";
    case "chainStatus:pending": return "Pending Onchain";
    case "chainStatus:unavailable": return "Onchain Unavailable";
    // Coverage status
    case "coverageStatus:complete": return "Complete";
    case "coverageStatus:partial": return "Partial";
    case "coverageStatus:none": return "None";
  }
  return value;
}

export function StatusBadge({ type, value, label }: StatusBadgeProps) {
  const colorClass = getBadgeColor(value as string, type);
  const display = label ?? getBadgeLabel(type, value as string);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {display}
    </span>
  );
}