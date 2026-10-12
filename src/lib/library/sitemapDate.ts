/** Project catalog timestamps to W3C dates without rewriting source records. */
export function sitemapLastModified(value?: string): string | undefined {
  if (!value) return undefined;
  const timestamp = value.trim().replace(" ", "T");
  const normalized = timestamp.includes("T") ? timestamp.replace(/([+-]\d{2})$/, "$1:00") : timestamp;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(normalized)) return undefined;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return undefined;
  const calendarDate = new Date(`${normalized.slice(0, 10)}T00:00:00Z`);
  if (calendarDate.toISOString().slice(0, 10) !== normalized.slice(0, 10)) return undefined;
  return normalized.length === 10 ? date.toISOString().slice(0, 10) : date.toISOString();
}
