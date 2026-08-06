import { useMemo } from "react";
import { CopyButton } from "../common/CopyButton";

interface FullJsonTabProps {
  document: unknown;
  label?: string;
}

export function FullJsonTab({ document, label }: FullJsonTabProps) {
  const json = useMemo(() => JSON.stringify(document, null, 2), [document]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          {label ?? "Full JSON"}
        </h3>
        <CopyButton text={json} />
      </div>
      <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
        {json}
      </pre>
    </div>
  );
}