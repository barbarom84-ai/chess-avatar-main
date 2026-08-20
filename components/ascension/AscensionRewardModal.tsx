"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Star, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  achievement?: "elo_cap_3000";
}

interface AscensionRewardModalProps {
  open: boolean;
  reward: AscensionRewardData | null;
  onContinue: () => void;
}

/* Pre-defined particle positions so SSR and client render the same thing. */
const PARTICLES: { x: number; y: number; size: number; delay: number; dur: number; color: string }[] =
  [
    { x: 8, y: 12, size: 2, delay: 0, dur: 2.1, color: "cyan" },
    { x: 20, y: 78, size: 1.5, delay: 0.3, dur: 1.8, color: "amber" },
    { x: 35, y: 25, size: 2.5, delay: 0.6, dur: 2.4, color: "purple" },
    { x: 55, y: 85, size: 1.5, delay: 0.1, dur: 1.9, color: "cyan" },
    { x: 70, y: 15, size: 2, delay: 0.4, dur: 2.2, color: "emerald" },
    { x: 82, y: 65, size: 1.5, delay: 0.7, dur: 1.7, color: "amber" },
    { x: 90, y: 35, size: 2, delay: 0.2, dur: 2.0, color: "purple" },
    { x: 14, y: 55, size: 1.5, delay: 0.5, dur: 2.3, color: "cyan" },
    { x: 48, y: 8, size: 2.5, delay: 0.9, dur: 1.6, color: "amber" },
    { x: 62, y: 50, size: 1.5, delay: 0.15, dur: 2.5, color: "emerald" },
    { x: 76, y: 90, size: 2, delay: 0.8, dur: 1.8, color: "cyan" },
    { x: 28, y: 42, size: 1.5, delay: 0.35, dur: 2.1, color: "purple" },
    { x: 93, y: 80, size: 2, delay: 0.65, dur: 1.9, color: "amber" },
    { x: 42, y: 68, size: 1.5, delay: 0.45, dur: 2.2, color: "cyan" },
    { x: 6, y: 88, size: 2.5, delay: 0.25, dur: 2.0, color: "emerald" },
    { x: 58, y: 30, size: 1.5, delay: 0.55, dur: 1.7, color: "purple" },
  ];

const COLOR_MAP: Record<string, string> = {
  cyan: "rgba(34,211,238,",
  amber: "rgba(251,191,36,",
  purple: "rgba(192,132,252,",
  emerald: "rgba(52,211,153,",
};

function useAnimatedCount(target: number, active: boolean, delay = 300) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { setDisplay(0); return; }
    const timeout = window.setTimeout(() => {
      const start = performance.now();
      const duration = 900;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(eased * target));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [target, active, delay]);
  return display;
}

export default function AscensionRewardModal({
  open,
  reward,
  onContinue,
}: AscensionRewardModalProps) {
  const { t } = useLanguage();
  const xpDisplay = useAnimatedCount(reward?.xpGain ?? 0, open, 400);
  const eloDisplay = useAnimatedCount(reward?.eloGain ?? 0, open, 600);

  if (!reward) return null;

  const tierUp = reward.newTier !== reward.previousTier;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md border-0 p-0 bg-transparent shadow-none overflow-visible [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Glowing backdrop */}
        <div className="absolute inset-[-40px] rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 border border-cyan-500/20 shadow-[0_0_80px_rgba(34,211,238,0.15),0_0_160px_rgba(16,185,129,0.08)] pointer-events-none" />

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size * 4}px`,
                height: `${p.size * 4}px`,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${COLOR_MAP[p.color]}0.8) 0%, ${COLOR_MAP[p.color]}0) 70%)`,
                boxShadow: `0 0 ${p.size * 3}px ${COLOR_MAP[p.color]}0.7)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
              }}
            />
          ))}
          {/* Floating sparkle icons */}
          {[
            { x: 5, y: 20, delay: "0s" },
            { x: 88, y: 10, delay: "0.4s" },
            { x: 92, y: 70, delay: "0.8s" },
            { x: 3, y: 75, delay: "1.2s" },
          ].map((s, i) => (
            <Sparkles
              key={i}
              className="absolute text-cyan-400/30 animate-spin"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: 14,
                height: 14,
                animationDuration: "8s",
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm p-6 space-y-5">
          <DialogHeader className="items-center text-center space-y-3">
            {/* Trophy with pulsing rings */}
            <div className="relative mx-auto">
              <span className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" style={{ animationDuration: "2s" }} />
              <span className="absolute inset-[-8px] rounded-full border border-emerald-400/15 animate-pulse" />
              <span className="absolute inset-[-16px] rounded-full border border-cyan-400/10 animate-pulse" style={{ animationDelay: "0.4s" }} />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-2 ring-emerald-400/50 shadow-[0_0_32px_rgba(52,211,153,0.4)]">
                <Trophy className="h-8 w-8 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
              {t.ascension.rewardTitle}
            </DialogTitle>
            <p className="text-sm text-slate-400">{t.ascension.rewardSubtitle}</p>
          </DialogHeader>

          {/* Reward cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/60 to-slate-950/80 p-4 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-[shimmer_2s_infinite]" />
              <Zap className="mx-auto mb-2 h-5 w-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              <p className="text-3xl font-bold tabular-nums text-amber-200">
                +{xpDisplay}
              </p>
              <p className="text-xs text-amber-400/80 mt-1">{t.ascension.xp}</p>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/60 to-slate-950/80 p-4 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-[shimmer_2s_0.3s_infinite]" />
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              <p className="text-3xl font-bold tabular-nums text-cyan-200">
                +{eloDisplay}
              </p>
              <p className="text-xs text-cyan-400/80 mt-1">{t.ascension.elo}</p>
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Star className="h-3 w-3 text-amber-400" />
              <span className="tabular-nums text-amber-300 font-semibold">{reward.newXp}</span>
              <span className="text-slate-500 text-xs">{t.ascension.xp}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="tabular-nums text-cyan-300 font-semibold">{reward.newElo}</span>
              <span className="text-slate-500 text-xs">ELO</span>
            </span>
          </div>

          {/* Tier-up */}
          {tierUp && (
            <div className="relative overflow-hidden flex items-center justify-center gap-3 rounded-xl border border-purple-500/50 bg-gradient-to-r from-purple-950/60 via-slate-900/60 to-purple-950/60 px-4 py-3 shadow-[0_0_20px_rgba(192,132,252,0.2)]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/8 to-transparent animate-[shimmer_1.5s_infinite]" />
              <Sparkles className="h-5 w-5 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] animate-spin" style={{ animationDuration: "4s" }} />
              <p className="text-sm font-semibold text-purple-100">
                {t.ascension.tierUp}{" "}
                <span className="text-purple-200 font-bold">
                  {t.ascension.tiers[reward.newTier]}
                </span>
              </p>
              <Sparkles className="h-5 w-5 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }} />
            </div>
          )}

          {reward.achievement === "elo_cap_3000" && (
            <div className="relative overflow-hidden flex flex-col items-center gap-1 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900/60 to-amber-950/60 px-4 py-3 shadow-[0_0_20px_rgba(251,191,36,0.2)] text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/8 to-transparent animate-[shimmer_1.5s_infinite]" />
              <Trophy className="h-6 w-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <p className="text-sm font-semibold text-amber-100">{t.ascension.achievementEloCapTitle}</p>
              <p className="text-xs text-amber-200/80">{t.ascension.achievementEloCapDesc}</p>
            </div>
          )}

          <DialogFooter className="sm:justify-center pt-1">
            <Button
              onClick={onContinue}
              className="w-full min-w-[180px] bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] border border-cyan-500/30 font-semibold text-base h-11 transition-all duration-200"
              style={{ backgroundSize: "200% 100%", animation: "shimmer 2.5s infinite" }}
            >
              {t.ascension.continue} →
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
