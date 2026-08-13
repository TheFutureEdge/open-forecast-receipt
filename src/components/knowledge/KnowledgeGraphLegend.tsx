import { ArrowRight } from "@phosphor-icons/react";
import { KnowledgeGraphTag } from "./KnowledgeGraphTag";

export function KnowledgeGraphLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 bg-slate-50 px-5 py-3 text-[10px] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400 sm:px-7 ${className}`}>
      <span className="font-bold uppercase tracking-[0.14em] text-slate-400">Legend</span>
      <KnowledgeGraphTag kind="schema">Schema.org entity type</KnowledgeGraphTag>
      <KnowledgeGraphTag kind="entity">Library entity type</KnowledgeGraphTag>
      <KnowledgeGraphTag kind="target">Forecast target</KnowledgeGraphTag>
      <KnowledgeGraphTag kind="dimension">Dimension</KnowledgeGraphTag>
      <KnowledgeGraphTag kind="unit">Unit</KnowledgeGraphTag>
      <KnowledgeGraphTag kind="relationship">
        <span className="inline-flex items-center gap-1.5"><ArrowRight size={12} weight="bold" /> Named relationship</span>
      </KnowledgeGraphTag>
    </div>
  );
}
