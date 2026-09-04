"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckSquare,
  Clock,
  Download,
  Eye,
  Square,
  Trash2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  formatGameHistoryDate,
  formatGameHistoryDuration,
  renderGameResultBadge,
  type GameHistoryBadgeCopy,
} from "@/lib/game-history-display";
import {
  isArenaBotVsBotGame,
  isPgnArchiveGame,
  type DbGame,
} from "@/lib/supabase-storage";
import {
  REVIEW_CONTEXT_SESSION_KEY,
  REVIEW_PGN_SESSION_KEY,
  setReviewSessionFromPlay,
} from "@/lib/review-session";

type GameHistoryListProps = {
  games: DbGame[];
  loading?: boolean;
  compact?: boolean;
  showBulkActions?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (gameId: string) => void;
  onToggleSelectAll?: () => void;
  onDownload?: (game: DbGame) => void;
  onDelete?: (gameId: string) => void;
  onViewGame?: (game: DbGame) => void;
  limit?: number;
};

function openGameReview(game: DbGame, router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  try {
    const playerColor =
      game.player_color === "white" || game.player_color === "black"
        ? game.player_color
        : undefined;
    if (game.bot_config) {
      setReviewSessionFromPlay(
        game.pgn,
        game.bot_config,
        game.opponent_name,
        playerColor
      );
    } else {
      sessionStorage.setItem(REVIEW_PGN_SESSION_KEY, game.pgn);
      sessionStorage.setItem(
        REVIEW_CONTEXT_SESSION_KEY,
        JSON.stringify({
          playerName: game.opponent_name,
          ...(playerColor ? { playerColor } : {}),
        })
      );
    }
  } catch {
    /* ignore */
  }
  router.push("/review");
}

export default function GameHistoryList({
  games,
  loading = false,
  compact = false,
  showBulkActions = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDownload,
  onDelete,
  onViewGame,
  limit,
}: GameHistoryListProps) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const visibleGames = limit ? games.slice(0, limit) : games;
  const gamesCopy = t.games;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
        <p className="text-slate-400 mt-4">{gamesCopy.loading}</p>
      </div>
    );
  }

  if (visibleGames.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">{gamesCopy.noGamesFound}</p>
        <p className="text-sm text-slate-500">{gamesCopy.startPlaying}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showBulkActions && onToggleSelectAll && selectedIds && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSelectAll}
            className="text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-2"
          >
            {selectedIds.size === visibleGames.length && visibleGames.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-cyan-400" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span className="text-xs">
              {selectedIds.size === visibleGames.length && visibleGames.length > 0
                ? gamesCopy.deselectAll
                : gamesCopy.selectAll}
            </span>
          </Button>
        </div>
      )}

      {visibleGames.map((game) => (
        <div
          key={game.id}
          className={`${compact ? "p-3" : "p-4"} bg-slate-950 rounded-lg border transition-all ${
            selectedIds?.has(game.id)
              ? "border-cyan-500 bg-cyan-500/5"
              : "border-slate-800 hover:border-cyan-500/50"
          }`}
        >
          <div
            className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row"} sm:items-center justify-between gap-3`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {showBulkActions && onToggleSelect && selectedIds && (
                <button
                  type="button"
                  onClick={() => onToggleSelect(game.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  {selectedIds.has(game.id) ? (
                    <CheckSquare className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-cyan-400`} />
                  ) : (
                    <Square className={`${compact ? "h-4 w-4" : "h-5 w-5"}`} />
                  )}
                </button>
              )}
              {game.opponent_avatar && (
                <Image
                  src={game.opponent_avatar}
                  alt={game.opponent_name}
                  width={compact ? 34 : 40}
                  height={compact ? 34 : 40}
                  className="rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <GameHistoryHeader
                  compact={compact}
                  game={game}
                  gamesCopy={{
                    ...gamesCopy,
                    archiveBadgeWhiteWins: t.review.saveDialog.archiveBadgeWhiteWins,
                    archiveBadgeBlackWins: t.review.saveDialog.archiveBadgeBlackWins,
                    archiveBadgeDraw: t.review.saveDialog.archiveBadgeDraw,
                    archiveBadgeUnknown: t.review.saveDialog.archiveBadgeUnknown,
                  }}
                />
                <div
                  className={`${compact ? "grid grid-cols-2 gap-x-3 gap-y-1" : "flex items-center gap-4"} text-xs text-slate-400`}
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatGameHistoryDate(game.created_at, lang)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGameHistoryDuration(game.duration_seconds)}
                  </span>
                  <span>
                    {gamesCopy.moves}: {game.moves_count}
                  </span>
                  <span className="capitalize">
                    {gamesCopy.color}:{" "}
                    {isPgnArchiveGame(game)
                      ? t.review.saveDialog.colorArchive
                      : isArenaBotVsBotGame(game)
                      ? gamesCopy.colorArenaBots
                      : game.player_color === "white"
                        ? gamesCopy.white
                        : gamesCopy.black}
                  </span>
                </div>
              </div>
            </div>

            <div className={`flex ${compact ? "w-full justify-end" : ""} gap-1.5 sm:gap-2`}>
              <Button
                size={compact ? "icon" : "sm"}
                variant="outline"
                onClick={() => (onViewGame ? onViewGame(game) : openGameReview(game, router))}
                className={`border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 ${compact ? "h-8 w-8" : ""}`}
                title={gamesCopy.viewGame}
              >
                <Eye className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
              </Button>
              {onDownload && (
                <Button
                  size={compact ? "icon" : "sm"}
                  variant="outline"
                  onClick={() => onDownload(game)}
                  className={`border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 ${compact ? "h-8 w-8" : ""}`}
                  title={gamesCopy.downloadPGN}
                >
                  <Download className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                </Button>
              )}
              {onDelete && (
                <Button
                  size={compact ? "icon" : "sm"}
                  variant="outline"
                  onClick={() => onDelete(game.id)}
                  className={`border-red-500/50 text-red-300 hover:bg-red-500/10 ${compact ? "h-8 w-8" : ""}`}
                  title={gamesCopy.delete}
                >
                  <Trash2 className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GameHistoryHeader({
  compact,
  game,
  gamesCopy,
}: {
  compact: boolean;
  game: DbGame;
  gamesCopy: GameHistoryBadgeCopy;
}) {
  return (
    <div className={`flex items-center gap-2 mb-1 ${compact ? "flex-wrap" : ""}`}>
      <h3
        className={`font-semibold text-slate-200 ${compact ? "text-sm truncate max-w-[140px]" : ""}`}
      >
        {game.opponent_name}
      </h3>
      {renderGameResultBadge(game, gamesCopy)}
      {game.opponent_platform && (
        <Badge variant="outline" className="text-xs">
          {game.opponent_platform}
        </Badge>
      )}
    </div>
  );
}