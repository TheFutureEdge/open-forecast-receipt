export function CollectionTags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return <ul aria-label="Collection categories" className="mt-3 flex flex-wrap gap-2">
    {tags.map(tag => <li key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{tag}</li>)}
  </ul>;
}
