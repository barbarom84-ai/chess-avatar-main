"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Learn page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-cyan-300">Ouvertures indisponibles</h1>
      <p className="text-slate-400 text-sm max-w-md">
        Le catalogue n&apos;a pas pu s&apos;afficher. Réessaie, ou reviens à l&apos;accueil.
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={() => reset()} className="bg-cyan-700 hover:bg-cyan-600">
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </main>
  );
}
