import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { DbGame } from "@/lib/supabase-storage";
import { isArenaBotVsBotGame } from "@/lib/supabase-storage";

type GamesCopy = {
  arenaOutcomeWhite: string;
  arenaOutcomeBlack: string;
  arenaOutcomeDraw: string;
  badgeArenaBot: string;
  resultBadgeYouWon: string;
  resultBadgeYouLost: string;
  resultBadgeYouDraw: string;
};

export function formatGameHistoryDate(dateString: string, lang: "fr" | "en"): string {
  return new Date(dateString).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatGameHistoryDuration(seconds?: number): string {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function renderGameResultBadge(game: DbGame, t: GamesCopy): ReactNode {
  if (isArenaBotVsBotGame(game)) {
    let outcomeBadge: ReactNode;
    switch (game.result_type) {
      case "arena_white_wins":
        outcomeBadge = (
          <Badge className="bg-slate-100 text-slate-900">{t.arenaOutcomeWhite}</Badge>
        );
        break;
      case "arena_black_wins":
        outcomeBadge = (
          <Badge className="bg-slate-800 text-slate-100">{t.arenaOutcomeBlack}</Badge>
        );
        break;
      default:
        outcomeBadge = (
          <Badge className="bg-amber-700 text-white">{t.arenaOutcomeDraw}</Badge>
        );
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="border-violet-500 text-violet-300">
          {t.badgeArenaBot}
        </Badge>
        {outcomeBadge}
      </div>
    );
  }

  switch (game.result) {
    case "win":
      return <Badge className="bg-green-600 text-white">{t.resultBadgeYouWon}</Badge>;
    case "loss":
      return <Badge className="bg-red-600 text-white">{t.resultBadgeYouLost}</Badge>;
    case "draw":
      return <Badge className="bg-amber-600 text-white">{t.resultBadgeYouDraw}</Badge>;
    default:
      return <Badge>{game.result}</Badge>;
  }
}
