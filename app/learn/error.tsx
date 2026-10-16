"use client";

import { useEffect } from "react";
import FetchErrorState from "@/components/FetchErrorState";
import { useLanguage } from "@/lib/language-context";

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();
  const errCopy = t.learn.errors;

  useEffect(() => {
    console.error("Learn page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center">
      <FetchErrorState
        title={errCopy.title}
        message={errCopy.generic}
        retryLabel={errCopy.retry}
        onRetry={() => reset()}
        secondaryHref="/"
        secondaryLabel={t.backToHome}
      />
    </main>
  );
}
