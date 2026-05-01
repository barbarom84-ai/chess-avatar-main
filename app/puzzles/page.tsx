import PuzzlesPageClient from "./PuzzlesPageClient";
import { getHistoricalGamesWithChallenges } from "@/lib/puzzle-historical-games";

export default function PuzzlesPage() {
  const historicalGames = getHistoricalGamesWithChallenges();
  return <PuzzlesPageClient historicalGames={historicalGames} />;
}
