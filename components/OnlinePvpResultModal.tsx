"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flag, Minus, Swords, Crown, Download, Home, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

export default function OnlinePvpResultModal({
  open,
  onOpenChange,
  result,
  resultMessage,
  totalMoves,
  captures,
  checks,
  durationLabel,
  onNewGame,
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
  onNewGame: () => void;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <div className={`text-center py-4 rounded-lg border-2 ${cfg.borderColor} ${cfg.bgColor}`}>
            <ResultIcon className={`h-12 w-12 ${cfg.color} mx-auto mb-2`} />
            <DialogTitle className={`text-2xl font-bold ${cfg.color} mb-1`}>{cfg.title}</DialogTitle>
            <p className={`text-sm font-semibold ${cfg.color}`}>{resultMessage}</p>
            <p className="text-xs text-slate-500 mt-2">{o.context}</p>
          </div>
          <DialogDescription className="sr-only">{o.summaryA11y}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">{t.gameResult.moves}</p>
                  <p className="font-bold text-slate-200 text-lg">{totalMoves}</p>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                    <Swords className="h-3 w-3" />
                    {t.gameResult.captures}
                  </p>
                  <p className="font-bold text-slate-200 text-lg">{captures}</p>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                    <Crown className="h-3 w-3" />
                    {t.gameResult.checks}
                  </p>
                  <p className="font-bold text-slate-200 text-lg">{checks}</p>
                </div>
              </div>
              {durationLabel && (
                <p className="text-center text-xs text-slate-500 mt-3">
                  {o.duration}: <span className="font-mono text-slate-300">{durationLabel}</span>
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onNewGame();
              }}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
              size="sm"
            >
              {o.newGame}
            </Button>

            {canSave && onSaveCloud && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
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
                className="border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                <Download className="mr-1 h-3 w-3" />
                {o.downloadPgn}
              </Button>
              <Button
                type="button"
                onClick={() => router.push("/")}
                variant="outline"
                size="sm"
                className="border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                <Home className="mr-1 h-3 w-3" />
                {t.gameResult.home}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
