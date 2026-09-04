"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import AvatarChatPanel from "@/components/AvatarChatPanel";
import ReviewCoachAnalysis from "@/components/ReviewCoachAnalysis";
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
import { dedupeReviewCoachAvatars } from "@/lib/review-coach-options";
import {
  buildReviewChatContext,
  type ReviewPlayerColor,
} from "@/lib/review-coach-context";
import type { CoachToneId } from "@/lib/coach-tone";
import type { ReviewedMove } from "@/lib/game-review";
import { cn } from "@/lib/utils";

export type ReviewCoachPanelProps = {
  opponentConfig?: EngineConfig | null;
  currentMove?: ReviewedMove | null;
  fen?: string | null;
  fenBefore?: string | null;
  moveNumber?: number;
  openingName?: string | null;
  whiteName?: string | null;
  blackName?: string | null;
  playerColor?: ReviewPlayerColor | null;
  onPlayerColorChange?: (color: ReviewPlayerColor) => void;
  coachTone: CoachToneId;
  onRequestUpgrade?: () => void;
  children?: ReactNode;
};

type ReviewCoachCtx = {
  opponentConfig?: EngineConfig | null;
  uniqueAvatars: Array<{ id: string; config: EngineConfig; stats: PersonaStats }>;
  coachId: string;
  setCoachId: (id: string) => void;
  selected: {
    config: EngineConfig;
    stats: PersonaStats;
    house: boolean;
  };
  reviewContext: ReturnType<typeof buildReviewChatContext>;
  playerColor: ReviewPlayerColor | null;
  onPlayerColorChange?: (color: ReviewPlayerColor) => void;
  currentMove?: ReviewedMove | null;
  fenBefore?: string | null;
  moveNumber?: number;
  coachTone: CoachToneId;
  onRequestUpgrade?: () => void;
  handleExplanationChange: (text: string | null) => void;
};

const ReviewCoachContext = createContext<ReviewCoachCtx | null>(null);

function useReviewCoach() {
  const ctx = useContext(ReviewCoachContext);
  if (!ctx) {
    throw new Error("ReviewCoach components must be used inside ReviewCoachProvider");
  }
  return ctx;
}

export function ReviewCoachProvider({
  opponentConfig,
  currentMove,
  fen,
  fenBefore,
  moveNumber,
  openingName,
  whiteName,
  blackName,
  playerColor = null,
  onPlayerColorChange,
  coachTone,
  onRequestUpgrade,
  children,
}: ReviewCoachPanelProps) {
  const [coachId, setCoachId] = useState(CHESS_AVATAR_PRO_COACH_ID);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);
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

  const uniqueAvatars = useMemo(
    () => dedupeReviewCoachAvatars(avatars, opponentConfig),
    [avatars, opponentConfig]
  );

  const selected = useMemo(() => {
    if (coachId === "opponent" && opponentConfig) {
      return {
        config: slimCoachFromConfig(opponentConfig),
        stats: minimalPersonaStatsFromConfig(opponentConfig),
        house: false,
      };
    }
    const saved = uniqueAvatars.find((a) => a.id === coachId);
    if (saved) {
      return { config: saved.config, stats: saved.stats, house: false };
    }
    return {
      config: CHESS_AVATAR_PRO_CONFIG,
      stats: CHESS_AVATAR_PRO_STATS,
      house: true,
    };
  }, [uniqueAvatars, coachId, opponentConfig]);

  const reviewContext = useMemo(
    () =>
      buildReviewChatContext({
        fen,
        fenBefore,
        move: currentMove,
        playerColor,
        openingName,
        whiteName,
        blackName,
        moveNumber,
        lastExplanation,
      }),
    [
      fen,
      fenBefore,
      currentMove,
      playerColor,
      openingName,
      whiteName,
      blackName,
      moveNumber,
      lastExplanation,
    ]
  );

  const handleExplanationChange = useCallback((text: string | null) => {
    setLastExplanation(text);
  }, []);

  const value = useMemo(
    () => ({
      opponentConfig,
      uniqueAvatars,
      coachId,
      setCoachId,
      selected,
      reviewContext,
      playerColor,
      onPlayerColorChange,
      currentMove,
      fenBefore,
      moveNumber,
      coachTone,
      onRequestUpgrade,
      handleExplanationChange,
    }),
    [
      opponentConfig,
      uniqueAvatars,
      coachId,
      selected,
      reviewContext,
      playerColor,
      onPlayerColorChange,
      currentMove,
      fenBefore,
      moveNumber,
      coachTone,
      onRequestUpgrade,
      handleExplanationChange,
    ]
  );

  return (
    <ReviewCoachContext.Provider value={value}>
      {children}
    </ReviewCoachContext.Provider>
  );
}

export function ReviewCoachSidebar() {
  const { t } = useLanguage();
  const {
    opponentConfig,
    uniqueAvatars,
    coachId,
    setCoachId,
    playerColor,
    onPlayerColorChange,
    currentMove,
    fenBefore,
    moveNumber,
    coachTone,
    onRequestUpgrade,
    handleExplanationChange,
  } = useReviewCoach();

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
          {uniqueAvatars.map((a) => (
            <option key={a.id} value={a.id}>
              {a.config.name || a.stats.username}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400 leading-snug">
          {playerColor === "white"
            ? t.review.coach.playingAsWhite
            : playerColor === "black"
              ? t.review.coach.playingAsBlack
              : t.review.coach.playingAsUnknown}
        </p>
        <div className="flex rounded-md border border-slate-700 overflow-hidden shrink-0">
          <button
            type="button"
            className={cn(
              "px-2 py-0.5 text-[10px] uppercase tracking-wide",
              playerColor === "white"
                ? "bg-cyan-500/20 text-cyan-100"
                : "text-slate-500 hover:text-slate-300"
            )}
            onClick={() => onPlayerColorChange?.("white")}
          >
            {t.review.white}
          </button>
          <button
            type="button"
            className={cn(
              "px-2 py-0.5 text-[10px] uppercase tracking-wide",
              playerColor === "black"
                ? "bg-cyan-500/20 text-cyan-100"
                : "text-slate-500 hover:text-slate-300"
            )}
            onClick={() => onPlayerColorChange?.("black")}
          >
            {t.review.black}
          </button>
        </div>
      </div>

      <ReviewCoachAnalysis
        move={currentMove}
        fenBefore={fenBefore}
        moveNumber={moveNumber}
        coachTone={coachTone}
        onRequestUpgrade={onRequestUpgrade}
        onExplanationChange={handleExplanationChange}
      />
    </div>
  );
}

export function ReviewCoachChat() {
  const { coachId, selected, reviewContext, playerColor, coachTone } =
    useReviewCoach();
  return (
    <AvatarChatPanel
      key={coachId}
      stats={selected.stats}
      config={selected.config}
      avatarUrl={selected.config.avatarUrl}
      variant="review"
      houseCoach={selected.house}
      reviewContext={reviewContext}
      playerColor={playerColor}
      coachTone={coachTone}
    />
  );
}

/** Full stacked coach (sidebar + chat) for callers that do not split the layout. */
export default function ReviewCoachPanel(props: ReviewCoachPanelProps) {
  return (
    <ReviewCoachProvider {...props}>
      <div className="space-y-2">
        <ReviewCoachSidebar />
        <ReviewCoachChat />
      </div>
    </ReviewCoachProvider>
  );
}
