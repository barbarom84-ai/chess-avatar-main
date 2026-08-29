"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import AvatarChatPanel from "@/components/AvatarChatPanel";
import { useLanguage } from "@/lib/language-context";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { getUserProfiles } from "@/lib/supabase-storage";
import { minimalPersonaStatsFromConfig } from "@/lib/avatar-card-model";
import {
  CHESS_AVATAR_PRO_COACH_ID,
  CHESS_AVATAR_PRO_CONFIG,
  CHESS_AVATAR_PRO_STATS,
  slimCoachFromConfig,
} from "@/lib/chess-avatar-pro-coach";
import type { ReviewedMove } from "@/lib/game-review";

type ReviewCoachPanelProps = {
  opponentConfig?: EngineConfig | null;
  currentMove?: ReviewedMove | null;
  fen?: string | null;
};

export default function ReviewCoachPanel({
  opponentConfig,
  currentMove,
  fen,
}: ReviewCoachPanelProps) {
  const { t } = useLanguage();
  const [coachId, setCoachId] = useState(CHESS_AVATAR_PRO_COACH_ID);
  const [avatars, setAvatars] = useState<
    Array<{ id: string; config: EngineConfig; stats: PersonaStats }>
  >([]);

  useEffect(() => {
    void getUserProfiles().then((rows) => {
      setAvatars(
        rows.map((p) => ({
          id: p.id,
          config: slimCoachFromConfig(p.config),
          stats: (p.stats as PersonaStats) ?? minimalPersonaStatsFromConfig(p.config),
        }))
      );
    });
  }, []);

  const selected = useMemo(() => {
    if (coachId === "opponent" && opponentConfig) {
      return {
        config: slimCoachFromConfig(opponentConfig),
        stats: minimalPersonaStatsFromConfig(opponentConfig),
        house: false,
      };
    }
    const saved = avatars.find((a) => a.id === coachId);
    if (saved) {
      return { config: saved.config, stats: saved.stats, house: false };
    }
    return {
      config: CHESS_AVATAR_PRO_CONFIG,
      stats: CHESS_AVATAR_PRO_STATS,
      house: true,
    };
  }, [avatars, coachId, opponentConfig]);

  const reviewContext = currentMove
    ? {
        fen: fen ?? undefined,
        lastMove: currentMove.san,
        classification: currentMove.classification,
      }
    : fen
      ? { fen }
      : undefined;

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-slate-500">
          {t.review.coach.pickerLabel}
        </Label>
        <select
          className="mt-1 w-full rounded-md border border-cyan-500/30 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
          value={
            coachId === "opponent" && !opponentConfig
              ? CHESS_AVATAR_PRO_COACH_ID
              : coachId
          }
          onChange={(e) => {
            setCoachId(e.target.value);
          }}
          aria-label={t.review.coach.pickerLabel}
        >
          <option value={CHESS_AVATAR_PRO_COACH_ID}>
            {t.review.coach.pickerDefault}
          </option>
          {opponentConfig && (
            <option value="opponent">
              {t.review.coach.pickerOpponent.replace(
                "{name}",
                opponentConfig.name || "Bot"
              )}
            </option>
          )}
          {avatars.map((a) => (
            <option key={a.id} value={a.id}>
              {a.config.name || a.stats.username}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-slate-500 leading-snug">
          {t.review.coach.pickerHint}
        </p>
      </div>
      <AvatarChatPanel
        key={coachId}
        stats={selected.stats}
        config={selected.config}
        avatarUrl={selected.config.avatarUrl}
        variant="review"
        houseCoach={selected.house}
        reviewContext={reviewContext}
      />
    </div>
  );
}
