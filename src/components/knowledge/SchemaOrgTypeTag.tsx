export function SchemaOrgTypeTag({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span
      className={`inline-flex w-fit min-w-0 max-w-full justify-self-start items-center rounded-full border border-orange-800 bg-orange-700 px-2 py-1 text-[8px] font-bold leading-none text-white shadow-sm ${className}`}
      title={`Schema.org: ${value}`}
    >
      <span className="truncate">Schema.org: {value}</span>
    </span>
  );
}
