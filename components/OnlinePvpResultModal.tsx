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
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Flag,
  Minus,
  Swords,
  Crown,
  Download,
  Home,
  Loader2,
  User,
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
      borderColor: "border-green-500",
      bgColor: "bg-green-500/10",
      icon: Trophy,
      title: o.titleWin,
    },
    loss: {
      color: "text-red-400",
      borderColor: "border-red-500",
      bgColor: "bg-red-500/10",
      icon: Flag,
      title: o.titleLoss,
    },
    draw: {
      color: "text-slate-400",
      borderColor: "border-slate-500",
      bgColor: "bg-slate-500/10",
      icon: Minus,
      title: o.titleDraw,
    },
  };

  const cfg = resultConfig[result];
  const ResultIcon = cfg.icon;
  const oppName = opponentDisplayName?.trim() || "Player";
  const h2h = headToHead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-slate-800 bg-slate-900 p-0 shadow-2xl",
          "fixed inset-x-0 bottom-16 top-auto z-50 w-full max-w-full translate-x-0 translate-y-0",
          "max-h-[min(88dvh,calc(100dvh-5rem))] rounded-t-2xl rounded-b-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4",
          "sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-lg sm:p-6 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-top-[48%]"
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-3 sm:overflow-visible sm:px-0 sm:pt-0 sm:pb-0">
          <DialogHeader className="space-y-0">
            <div
              className={cn(
                "text-center rounded-xl border-2",
                cfg.borderColor,
                cfg.bgColor,
                "py-3 px-3 sm:py-4"
              )}
            >
              <ResultIcon className={cn("mx-auto mb-1.5 sm:mb-2", cfg.color, "h-9 w-9 sm:h-12 sm:w-12")} />
              <DialogTitle className={cn("font-bold mb-0.5 sm:mb-1", cfg.color, "text-xl sm:text-2xl")}>
                {cfg.title}
              </DialogTitle>
              <p className={cn("font-semibold", cfg.color, "text-xs sm:text-sm")}>{resultMessage}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2">{o.context}</p>
            </div>
            <DialogDescription className="sr-only">{o.summaryA11y}</DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3 sm:mt-2">
            {opponentUserId && (
              <Card className="bg-slate-950 border-slate-700/80">
                <CardContent className="space-y-3 px-3 py-3 sm:px-6 sm:pt-4 sm:pb-4">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">
                    {o.opponentTitle}
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="relative h-11 w-11 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-full border border-slate-600 bg-gradient-to-br from-cyan-600 to-blue-800">
                      <AccountAvatar
                        src={opponentAvatarUrl}
                        alt={oppName}
                        initials={accountProfileInitials(oppName)}
                        sizes="56px"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                      <p className="text-base sm:text-lg font-semibold text-slate-100 truncate">{oppName}</p>
                      {timeControlLabel ? (
                        <p className="text-[11px] sm:text-xs text-slate-400">
                          {o.timeControlPlayed}:{" "}
                          <span className="text-slate-300">{timeControlLabel}</span>
                        </p>
                      ) : null}
                      {opponentBio ? (
                        <p className="hidden text-xs text-slate-400 line-clamp-2 sm:block">{opponentBio}</p>
                      ) : null}
                      <Button
                        asChild
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-cyan-400 text-xs sm:text-sm"
                      >
                        <Link href={`/players/${opponentUserId}`}>{o.opponentProfileLink}</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 sm:py-2.5">
                    <p className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {o.headToHeadTitle}
                    </p>
                    {headToHeadLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden />
                    ) : h2h && h2h.total > 0 ? (
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm text-slate-200">
                          {o.headToHeadLine
                            .replace("{wins}", String(h2h.wins))
                            .replace("{losses}", String(h2h.losses))
                            .replace("{draws}", String(h2h.draws))}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500">
                          {o.headToHeadTotal.replace("{total}", String(h2h.total))}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-400">{o.headToHeadEmpty}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="px-3 py-3 sm:px-6 sm:pt-4 sm:pb-4">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg border border-slate-800 text-center">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">{t.gameResult.moves}</p>
                    <p className="font-bold text-slate-200 text-base sm:text-lg">{totalMoves}</p>
                  </div>
                  <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg border border-slate-800 text-center">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                      <Swords className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t.gameResult.captures}</span>
                    </p>
                    <p className="font-bold text-slate-200 text-base sm:text-lg">{captures}</p>
                  </div>
                  <div className="bg-slate-900 p-1.5 sm:p-2 rounded-lg border border-slate-800 text-center">
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                      <Crown className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t.gameResult.checks}</span>
                    </p>
                    <p className="font-bold text-slate-200 text-base sm:text-lg">{checks}</p>
                  </div>
                </div>
                {durationLabel && (
                  <p className="text-center text-[10px] sm:text-xs text-slate-500 mt-2 sm:mt-3">
                    {o.duration}: <span className="font-mono text-slate-300">{durationLabel}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 space-y-2 border-t border-slate-800 bg-slate-900/98 px-4 py-3",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            "sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-3"
          )}
        >
          {onRematch && (
            <Button
              type="button"
              onClick={() => void onRematch()}
              disabled={rematchLoading}
              className="w-full h-11 sm:h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
              size="sm"
            >
              {rematchLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {o.rematch}
            </Button>
          )}

          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onNewGame();
            }}
            variant={onRematch ? "outline" : "default"}
            className={
              onRematch
                ? "w-full h-11 sm:h-9 border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                : "w-full h-11 sm:h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
            }
            size="sm"
          >
            {o.newGame}
          </Button>

          {canSave && onSaveCloud && (
            <Button
              type="button"
              variant="secondary"
              className="w-full h-11 sm:h-9"
              size="sm"
              disabled={saving}
              onClick={() => void onSaveCloud()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : o.saveCloud}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={onDownloadPgn}
              variant="outline"
              size="sm"
              className="h-11 sm:h-9 border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 text-xs sm:text-sm"
            >
              <Download className="mr-1 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{o.downloadPgn}</span>
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="h-11 sm:h-9 border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 text-xs sm:text-sm"
            >
              <Home className="mr-1 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.gameResult.home}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
