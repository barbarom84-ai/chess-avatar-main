"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl font-semibold text-cyan-400">Something went wrong</h1>
        <p className="text-slate-400 text-sm text-center max-w-md">
          An unexpected error occurred. The incident was reported if monitoring is enabled.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
