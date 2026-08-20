"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Flag,
  Minus,
  Swords,
  Crown,
  Download,
  Home,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import AccountAvatar from "@/components/AccountAvatar";
import { accountProfileInitials } from "@/lib/account-profile";
import type { PvpHeadToHeadRecord } from "@/lib/pvp-head-to-head";
import { cn } from "@/lib/utils";

export default function OnlinePvpResultModal({
  open,
  onOpenChange,
  result,
  resultMessage,
  totalMoves,
  captures,
  checks,
  durationLabel,
  opponentUserId,
  opponentDisplayName,
  opponentAvatarUrl,
  opponentBio,
  timeControlLabel,
  headToHead,
  headToHeadLoading,
  onNewGame,
  onRematch,
  rematchLoading,
  onDownloadPgn,
  onSaveCloud,
  canSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: "win" | "loss" | "draw";
  resultMessage: string;
  totalMoves: number;
  captures: number;
  checks: number;
  durationLabel?: string;
  opponentUserId?: string | null;
  opponentDisplayName?: string | null;
  opponentAvatarUrl?: string | null;
  opponentBio?: string | null;
  timeControlLabel?: string | null;
  headToHead?: PvpHeadToHeadRecord | null;
  headToHeadLoading?: boolean;
  onNewGame: () => void;
  onRematch?: () => void;
  rematchLoading?: boolean;
  onDownloadPgn: () => void;
  onSaveCloud?: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const o = t.playOnline.resultModal;

  const resultConfig = {
    win: {
      color: "text-green-400",
      ring: "ring-green-500/30",
      bg: "bg-green-500/10",
      icon: Trophy,
      title: o.titleWin,
    },
    loss: {
      color: "text-red-400",
      ring: "ring-red-500/30",
      bg: "bg-red-500/10",
      icon: Flag,
      title: o.titleLoss,
    },
    draw: {
      color: "text-slate-300",
      ring: "ring-slate-500/30",
      bg: "bg-slate-500/10",
      icon: Minus,
      title: o.titleDraw,
    },
  };

  const cfg = resultConfig[result];
  const ResultIcon = cfg.icon;
  const oppName = opponentDisplayName?.trim() || "Player";
  const h2h = headToHead;

  const h2hLine =
    h2h && h2h.total > 0
      ? o.headToHeadLine
          .replace("{wins}", String(h2h.wins))
          .replace("{losses}", String(h2h.losses))
          .replace("{draws}", String(h2h.draws))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-slate-800 bg-slate-900 p-0 shadow-2xl",
          "fixed inset-x-0 bottom-14 top-auto z-50 w-full max-w-full translate-x-0 translate-y-0",
          "max-h-[min(70dvh,calc(100dvh-6rem))] rounded-t-xl rounded-b-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-3",
          "sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-lg sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-top-[48%]"
        )}
      >
        <div className="shrink-0 flex justify-center pt-2 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-600" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-2 sm:px-5 sm:pt-4 sm:pb-3">
          <DialogHeader className="space-y-0 text-left sm:text-center">
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1",
                cfg.bg,
                cfg.ring,
                "sm:flex-col sm:gap-1.5 sm:py-3"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  cfg.bg,
                  "sm:h-11 sm:w-11"
                )}
              >
                <ResultIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", cfg.color)} />
              </div>
              <div className="min-w-0 flex-1 sm:text-center">
                <DialogTitle className={cn("text-base font-bold leading-tight sm:text-lg", cfg.color)}>
                  {cfg.title}
                </DialogTitle>
                <p className={cn("text-xs font-medium truncate sm:text-sm", cfg.color)}>
                  {resultMessage}
                </p>
                <p className="hidden text-[11px] text-slate-500 mt-1 sm:block">{o.context}</p>
              </div>
            </div>
            <DialogDescription className="sr-only">{o.summaryA11y}</DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 sm:justify-center sm:text-xs">
            <span>
              {totalMoves} {t.gameResult.moves}
            </span>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Swords className="h-3 w-3 shrink-0" aria-hidden />
              {captures}
            </span>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Crown className="h-3 w-3 shrink-0" aria-hidden />
              {checks}
            </span>
            {durationLabel ? (
              <>
                <span className="text-slate-600" aria-hidden>
                  ·
                </span>
                <span className="font-mono text-slate-300">{durationLabel}</span>
              </>
            ) : null}
            {timeControlLabel ? (
              <>
                <span className="hidden text-slate-600 sm:inline" aria-hidden>
                  ·
                </span>
                <span className="hidden sm:inline text-slate-500">{timeControlLabel}</span>
              </>
            ) : null}
          </div>

          {opponentUserId ? (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-700 to-blue-900">
                  <AccountAvatar
                    src={opponentAvatarUrl}
                    alt={oppName}
                    initials={accountProfileInitials(oppName)}
                    sizes="36px"
                    className="text-[10px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100 truncate">{oppName}</p>
                  {timeControlLabel ? (
                    <p className="text-[10px] text-slate-500 truncate sm:hidden">
                      {timeControlLabel}
                    </p>
                  ) : null}
                </div>
                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  <Link href={`/players/${opponentUserId}`}>{o.opponentProfileLink}</Link>
                </Button>
              </div>
              {opponentBio ? (
                <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-1 hidden sm:block">
                  {opponentBio}
                </p>
              ) : null}
              <div className="mt-2 border-t border-slate-800/80 pt-2">
                {headToHeadLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-hidden />
                ) : h2hLine ? (
                  <p className="text-[11px] text-slate-400 leading-snug">{h2hLine}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">{o.headToHeadEmpty}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-slate-800 bg-slate-900/95 px-4 py-2.5 space-y-2",
            "pb-[max(0.625rem,env(safe-area-inset-bottom))]",
            "sm:px-5 sm:py-3"
          )}
        >
          <div className={cn("grid gap-2", onRematch ? "grid-cols-2" : "grid-cols-1")}>
            {onRematch ? (
              <Button
                type="button"
                onClick={() => void onRematch()}
                disabled={rematchLoading}
                size="sm"
                className="h-10 bg-violet-600 hover:bg-violet-500 text-white font-semibold"
              >
                {rematchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {o.rematch}
                  </>
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onNewGame();
              }}
              size="sm"
              variant={onRematch ? "secondary" : "default"}
              className={cn(
                "h-10 font-semibold",
                !onRematch && "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
            >
              {o.newGame}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canSave && onSaveCloud ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1 text-xs text-slate-300"
                disabled={saving}
                onClick={() => void onSaveCloud()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : o.saveCloud}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={onDownloadPgn}
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-xs text-slate-400"
            >
              <Download className="mr-1 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">PGN</span>
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/")}
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-xs text-slate-400"
            >
              <Home className="mr-1 h-3.5 w-3.5 shrink-0" />
              {t.gameResult.home}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
