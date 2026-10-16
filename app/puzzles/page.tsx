import { Suspense } from "react";
import PuzzlesPageClient from "./PuzzlesPageClient";
import { getHistoricalGamesWithChallenges } from "@/lib/puzzle-historical-games";

export default function PuzzlesPage() {
  const historicalGames = getHistoricalGamesWithChallenges();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        </div>
      }
    >
      <PuzzlesPageClient historicalGames={historicalGames} />
    </Suspense>
  );
}
