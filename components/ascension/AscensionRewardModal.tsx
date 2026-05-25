"use client";

import { Sparkles, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChampionTier } from "@/lib/ascension/types";
import { useLanguage } from "@/lib/language-context";

export interface AscensionRewardData {
  xpGain: number;
  eloGain: number;
  newElo: number;
  newXp: number;
  newTier: ChampionTier;
  previousTier: ChampionTier;
}

interface AscensionRewardModalProps {
  open: boolean;
  reward: AscensionRewardData | null;
  onContinue: () => void;
}

export default function AscensionRewardModal({
  open,
  reward,
  onContinue,
}: AscensionRewardModalProps) {
  const { t } = useLanguage();
  if (!reward) return null;

  const tierUp = reward.newTier !== reward.previousTier;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md border-cyan-500/30 bg-gradient-to-b from-slate-900 to-slate-950 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-400/40 animate-in zoom-in-95 duration-300">
            <Trophy className="h-7 w-7 text-emerald-400" />
          </div>
          <DialogTitle className="text-xl text-emerald-100">{t.ascension.rewardTitle}</DialogTitle>
          <DialogDescription>{t.ascension.rewardSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Zap className="mx-auto mb-2 h-5 w-5 text-amber-400" />
            <p className="text-2xl font-bold tabular-nums text-amber-200">+{reward.xpGain}</p>
            <p className="text-xs text-amber-400/80">{t.ascension.xp}</p>
          </div>
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-cyan-400" />
            <p className="text-2xl font-bold tabular-nums text-cyan-200">+{reward.eloGain}</p>
            <p className="text-xs text-cyan-400/80">{t.ascension.elo}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 px-4 py-3 text-center text-sm text-slate-300">
          <span className="text-slate-500">{t.ascension.elo}: </span>
          <span className="font-semibold tabular-nums text-cyan-300">{reward.newElo}</span>
          <span className="mx-2 text-slate-600">·</span>
          <span className="text-slate-500">{t.ascension.xp}: </span>
          <span className="font-semibold tabular-nums text-amber-300">{reward.newXp}</span>
        </div>

        {tierUp && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 bg-purple-950/40 px-4 py-3 animate-in fade-in duration-500">
            <Sparkles className="h-5 w-5 text-purple-300" />
            <p className="text-sm font-medium text-purple-200">
              {t.ascension.tierUp}{" "}
              <span className="text-purple-100">{t.ascension.tiers[reward.newTier]}</span>
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-center pt-2">
          <Button
            onClick={onContinue}
            className="w-full sm:w-auto min-w-[160px] bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
          >
            {t.ascension.continue}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
