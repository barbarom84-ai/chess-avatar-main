"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ChevronRight, History, Loader2, Microscope, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { setReviewSessionFromAnalyze } from "@/lib/review-session";
import { fill, formatRelativeDate } from "@/lib/account-format";
import type { AccountRecentGame } from "@/lib/account-types";
import { cn } from "@/lib/utils";
import type { AccountCopy } from "./types";

type RecentGamesListProps = {
  copy: AccountCopy;
  lang: string;
  games: AccountRecentGame[] | null;
  playerName: string;
};

export function RecentGamesList({ copy, lang, games, playerName }: RecentGamesListProps) {
  const router = useRouter();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const analyze = async (game: AccountRecentGame) => {
    if (!supabase) return;
    setOpeningId(game.id);
    try {
      const { data, error } = await supabase.from("games").select("pgn").eq("id", game.id).maybeSingle();
      const pgn = (data as { pgn?: string | null } | null)?.pgn;
      if (error || !pgn) {
        toast.error(copy.recent.analyzeError);
        return;
      }
      setReviewSessionFromAnalyze(playerName, pgn);
      router.push("/review");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section className="account-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="account-card-title !mb-0">
          <History aria-hidden />
          {copy.recent.title}
        </h3>
        <Link href="/games" className="text-xs font-medium text-cyan-300 hover:text-cyan-200 inline-flex items-center min-h-9">
          {copy.viewAllGames}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {games === null ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="account-skeleton h-14" />
          ))}
        </ul>
      ) : games.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">{copy.recent.empty}</p>
      ) : (
        <ul className="space-y-2">
          {games.map((game) => {
            const KindIcon = game.kind === "bot" ? Bot : Users;
            return (
              <li
                key={`${game.kind}-${game.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2.5"
              >
                <span className={cn("result-pill", game.result && `result-pill--${game.result}`)}>
                  {game.result ? copy.recent.result[game.result] : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100 truncate">{game.opponent}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <KindIcon className="h-3 w-3" aria-hidden />
                    {game.kind === "bot" ? copy.recent.bot : copy.recent.pvp}
                    {game.playerColor && (
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full border border-slate-500",
                          game.playerColor === "white" ? "bg-slate-100" : "bg-slate-900"
                        )}
                        aria-label={game.playerColor === "white" ? copy.stats.white : copy.stats.black}
                      />
                    )}
                    {game.movesCount ? <span>· {fill(copy.recent.moves, { n: game.movesCount })}</span> : null}
                    <span>· {formatRelativeDate(game.createdAt, lang)}</span>
                  </p>
                </div>
                {game.kind === "bot" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-10 min-w-10 text-cyan-300 hover:text-cyan-200 shrink-0"
                    aria-label={`${copy.recent.analyze} · ${game.opponent}`}
                    title={copy.recent.analyze}
                    onClick={() => void analyze(game)}
                    disabled={openingId === game.id}
                  >
                    {openingId === game.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Microscope className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-1">{copy.recent.analyze}</span>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="ghost" className="min-h-10 min-w-10 text-violet-300 hover:text-violet-200 shrink-0">
                    <Link
                      href={`/online?game=${encodeURIComponent(game.id)}`}
                      aria-label={`${copy.recent.open} · ${game.opponent}`}
                      title={copy.recent.open}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">{copy.recent.open}</span>
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
