interface ShaDisplayProps {
  label: string;
  hash?: string;
  match?: boolean;
}

export function ShaDisplay({ label, hash, match }: ShaDisplayProps) {
  if (!hash) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
          {hash}
        </code>
        {match !== undefined && (
          <span className={`text-xs font-medium ${match ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {match ? "✓ Match" : "✗ Mismatch"}
          </span>
        )}
      </div>
    </div>
  );
}