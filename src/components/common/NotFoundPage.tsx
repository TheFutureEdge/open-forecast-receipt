import { Link } from "../../lib/router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">404</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">This page does not exist.</p>
      <Link
        to="/manifest/batch-6"
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer active:scale-95"
      >
        View Manifest
      </Link>
    </div>
  );
}
