import type { ReactNode } from "react";

export type KnowledgeGraphTagKind = "schema" | "entity" | "target" | "dimension" | "unit" | "relationship";

const tagClasses: Record<KnowledgeGraphTagKind, string> = {
  schema: "border-orange-600 bg-orange-500 text-white",
  entity: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  target: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  dimension: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  unit: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  relationship: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
};

export function KnowledgeGraphTag({
  kind,
  children,
  className = "",
  title,
}: {
  kind: KnowledgeGraphTagKind;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex w-fit min-w-0 max-w-full items-center rounded-full border px-2.5 py-1 text-[9px] font-extrabold leading-none shadow-sm sm:text-[10px] ${tagClasses[kind]} ${className}`}
      title={title}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
