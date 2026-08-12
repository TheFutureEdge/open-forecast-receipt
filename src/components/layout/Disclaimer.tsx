import { Warning } from "@phosphor-icons/react";

export function Disclaimer() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-1.5 px-4 py-1.5 text-center text-[11px] font-medium text-amber-800 dark:text-amber-300">
        <Warning size={14} weight="fill" aria-hidden="true" />
        <span>Experimental educational content—not investment advice. Blockchain proof confirms integrity and timing, not accuracy.</span>
      </div>
    </div>
  );
}
