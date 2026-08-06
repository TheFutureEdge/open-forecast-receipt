import { Link } from "../../lib/router";
import { StatusBadge } from "../common/StatusBadge";
import type { DataStatus } from "../../types/verification";

interface AdvisorCardProps {
  index: number;
  dataStatus: DataStatus;
  forecasterLabel?: string;
  receiptDigest?: string;
}

const advisorNames = [
  "Ray Dalio", "Cathie Wood", "Warren Buffett", "George Soros",
  "Jim Simons", "Peter Lynch", "Bill Ackman", "David Einhorn",
  "Howard Marks", "Charlie Munger", "Carl Icahn", "John Paulson",
];

export function AdvisorCard({ index, dataStatus, forecasterLabel, receiptDigest }: AdvisorCardProps) {
  if (dataStatus === "fixture_pending") {
    return (
      <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Advisor {index + 1}
          </div>
          <StatusBadge type="dataStatus" value="fixture_pending" />
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {advisorNames[index]} — No forecast loaded yet
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/receipts/${receiptDigest}`}
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {forecasterLabel ?? advisorNames[index]}
        </div>
        <StatusBadge type="dataStatus" value="loaded" />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
        {receiptDigest?.slice(0, 24)}...
      </div>
    </Link>
  );
}
