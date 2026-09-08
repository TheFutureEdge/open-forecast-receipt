export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-20 dark:bg-slate-950" aria-busy="true" aria-label="Loading Forecast Library">
      <div className="mx-auto max-w-5xl animate-pulse space-y-5">
        <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
