import { getBaseTransactionUrl, getEasAttestationUrl } from "../../lib/eas/constants";
import { Link } from "../../lib/router";
import {
  isShowcaseReceipt,
  type FixtureCatalogEntry,
} from "../../data/fixtures/catalog";
import { StatusBadge } from "../common/StatusBadge";

interface AdvisorCardListProps {
  fixtures: FixtureCatalogEntry[];
  advisorCount: number;
}

function BlockchainProofCell({ fixture }: { fixture: FixtureCatalogEntry }) {
  const selected = isShowcaseReceipt(fixture.receiptDigest);
  if (fixture.chainStatus === "verified" && fixture.attestationUID) {
    return (
      <div className="space-y-1">
        <a
          href={getEasAttestationUrl(fixture.attestationUID)}
          target="_blank"
          rel="noreferrer"
          className="block whitespace-nowrap text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View EAS proof ↗
        </a>
        {fixture.transactionHash && (
          <a
            href={getBaseTransactionUrl(fixture.transactionHash)}
            target="_blank"
            rel="noreferrer"
            className="block text-[11px] text-gray-500 hover:underline dark:text-gray-400"
          >
            Transaction ↗
          </a>
        )}
      </div>
    );
  }
  if (selected) {
    return (
      <div className="space-y-1">
        <StatusBadge type="chainStatus" value={fixture.chainStatus} label="Showcase selected" />
        <div className="text-[11px] text-gray-500 dark:text-gray-400">Base Sepolia issuance pending</div>
      </div>
    );
  }
  return <span className="text-xs text-gray-400 dark:text-gray-500">Not selected for pilot</span>;
}

export function AdvisorCardList({ fixtures, advisorCount }: AdvisorCardListProps) {
  const rows = Array.from({ length: advisorCount }, (_, index) => fixtures[index]);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950"
      role="region"
      aria-label="Individual forecast receipt ledger"
      tabIndex={0}
    >
      <table className="w-full min-w-[900px] border-collapse text-left">
        <caption className="sr-only">
          One row per individual advisor forecast, including its independent blockchain proof status.
        </caption>
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" scope="col">Advisor forecast</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" scope="col">Mode</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" scope="col">Forecast receipt</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" scope="col">Data</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" scope="col">Blockchain proof</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((fixture, index) => (
            <tr key={fixture?.receiptDigest ?? index} className="hover:bg-gray-50 dark:hover:bg-gray-900/70">
              {fixture ? (
                <>
                  <th className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100" scope="row">
                    {fixture.forecasterLabel}
                  </th>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">{fixture.mode}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/receipts/${fixture.receiptDigest}`}
                      className="block text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open receipt
                    </Link>
                    <code className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">
                      {fixture.receiptDigest.slice(0, 12)}…{fixture.receiptDigest.slice(-8)}
                    </code>
                  </td>
                  <td className="px-4 py-3"><StatusBadge type="dataStatus" value="loaded" /></td>
                  <td className="px-4 py-3"><BlockchainProofCell fixture={fixture} /></td>
                </>
              ) : (
                <td className="px-4 py-3 text-sm text-gray-400" colSpan={5}>
                  Advisor slot {index + 1}: fixture pending
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
