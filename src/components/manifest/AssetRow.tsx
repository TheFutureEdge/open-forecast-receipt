import { CaretRight, CheckCircle, LinkSimple } from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import type { BatchManifestEntity } from "../../types/manifest";
import { StatusBadge } from "../common/StatusBadge";
import { EntityLogo } from "../entities/EntityLogo";
import { publicEntityForecastLedgerPath } from "../../lib/library/entityRoutes";

interface AssetRowProps {
  asset: BatchManifestEntity;
}

export function AssetRow({ asset }: AssetRowProps) {
  const proofCounts = {
    selected: asset.showcaseSelectionCount ?? 0,
    verified: asset.proofCount ?? 0,
  };
  return (
    <Link
      to={publicEntityForecastLedgerPath(asset.slug)}
      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-blue-50/50 active:bg-blue-50 md:grid-cols-[minmax(240px,1.5fr)_0.7fr_0.75fr_1fr_32px] md:items-center dark:hover:bg-blue-950/20"
    >
      <div className="flex min-w-0 items-center gap-3">
        <EntityLogo
          src={asset.logoUrl}
          alt={asset.logoAlt || `${asset.name} logo`}
          className="size-10"
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-950 dark:text-white">{asset.displaySymbol}</span>
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{asset.name}</span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-400">{asset.marketIdentifier}</div>
        </div>
      </div>
      <div><StatusBadge type="coverageStatus" value={asset.coverageStatus} label={asset.coverageStatus === "complete" ? "Complete" : undefined} /></div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <CheckCircle size={15} weight="fill" className="text-emerald-500" />
        {asset.loadedCount}/{asset.advisorCount}
      </div>
      <div className="flex items-center gap-2">
        <LinkSimple size={16} className={proofCounts.verified > 0 ? "text-blue-600" : "text-slate-400"} />
        <StatusBadge
          type="chainStatus"
          value={proofCounts.verified > 0 ? "verified" : asset.chainStatus}
          label={proofCounts.selected > 0 ? `${proofCounts.verified}/${proofCounts.selected} public proofs` : "Optional"}
        />
      </div>
      <CaretRight className="justify-self-end text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" size={18} weight="bold" />
    </Link>
  );
}
