import type { ReconstructionResult } from "../../types/path";

interface ReconstructionTableProps {
  reconstruction: ReconstructionResult;
}

export function ReconstructionTable({ reconstruction }: ReconstructionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Step</th>
            <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Valid At</th>
            <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Step Return</th>
            <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Cumulative Return</th>
            <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <td className="py-2 px-2 text-gray-500">0</td>
            <td className="py-2 px-2">{new Date(reconstruction.anchorAt).toLocaleDateString()}</td>
            <td className="py-2 px-2 text-right text-gray-500">—</td>
            <td className="py-2 px-2 text-right text-gray-500">—</td>
            <td className="py-2 px-2 text-right font-medium">${reconstruction.anchorValue.toFixed(2)}</td>
          </tr>
          {reconstruction.steps.map((step) => (
            <tr
              key={step.stepNumber}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="py-2 px-2 text-gray-500">{step.stepNumber}</td>
              <td className="py-2 px-2">{new Date(step.validAt).toLocaleDateString()}</td>
              <td className={`py-2 px-2 text-right ${step.stepReturnBps >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {step.stepReturnPercent}
              </td>
              <td className={`py-2 px-2 text-right ${!step.cumulativeReturnPercent.startsWith("-") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {step.cumulativeReturnPercent}
              </td>
              <td className="py-2 px-2 text-right font-medium">${step.impliedPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}