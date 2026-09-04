"use client";

import { useCallback, useEffect, useRef } from "react";
import { Crown, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useCoachExplain } from "@/hooks/useCoachExplain";
import { isExplainableReviewedMove } from "@/lib/review-coach-context";
import type { CoachToneId } from "@/lib/coach-tone";
import type { ReviewedMove } from "@/lib/game-review";
import CoachSanText from "@/components/CoachSanText";

type ReviewCoachAnalysisProps = {
  move?: ReviewedMove | null;
  fenBefore?: string | null;
  moveNumber?: number;
  coachTone: CoachToneId;
  onRequestUpgrade?: () => void;
  onExplanationChange?: (text: string | null) => void;
};

export default function ReviewCoachAnalysis({
  move,
  fenBefore,
  moveNumber,
  coachTone,
  onRequestUpgrade,
  onExplanationChange,
}: ReviewCoachAnalysisProps) {
  const { t, lang } = useLanguage();
  const coach = useCoachExplain();
  const canExplain = Boolean(move && fenBefore && isExplainableReviewedMove(move));
  const lastGoodRef = useRef<{
    key: string;
    explanation: string;
    remaining: number | null;
    limit: number | null;
    cached: boolean;
  } | null>(null);
  const moveKey = `${move?.ply ?? ""}:${move?.uci ?? ""}`;

  useEffect(() => {
    lastGoodRef.current = null;
  }, [move?.ply, move?.uci]);

  useEffect(() => {
    if (!move || !fenBefore || !isExplainableReviewedMove(move)) {
      coach.reset();
      onExplanationChange?.(null);
      lastGoodRef.current = null;
      return;
    }

    const timer = window.setTimeout(() => {
      void coach.explain({
        move,
        fenBefore,
        lang,
        moveNumber,
        coachTone,
      });
    }, 350);
    return () => window.clearTimeout(timer);
    // Key on move identity + prompt inputs, not the unstable coach object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move?.ply, move?.uci, fenBefore, lang, moveNumber, coachTone]);

  useEffect(() => {
    if (coach.status === "ready" && coach.explanation) {
      lastGoodRef.current = {
        key: moveKey,
        explanation: coach.explanation,
        remaining: coach.remaining,
        limit: coach.limit,
        cached: coach.cached,
      };
    }
    onExplanationChange?.(
      coach.status === "ready" && coach.explanation
        ? coach.explanation
        : lastGoodRef.current?.key === moveKey
          ? lastGoodRef.current.explanation
          : null
    );
  }, [coach.status, coach.explanation, coach.remaining, coach.limit, coach.cached, moveKey, onExplanationChange]);

  const handleClick = useCallback(() => {
    if (!move || !fenBefore) return;
    void coach.explain({ move, fenBefore, lang, moveNumber, coachTone });
  }, [coach, move, fenBefore, lang, moveNumber, coachTone]);

  if (!canExplain) {
    return (
      <p className="text-[11px] text-slate-500 leading-snug">
        {t.review.coach.pickAMove}
      </p>
    );
  }

  const sticky =
    lastGoodRef.current && lastGoodRef.current.key === moveKey
      ? lastGoodRef.current
      : null;

  const analysisCard = (
    explanation: string,
    remaining: number | null,
    limit: number | null,
    cached: boolean,
    loading = false
  ) => (
    <div className="rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-purple-200 font-bold">
          <Sparkles className="h-3 w-3" />
          {t.review.coach.title}
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-300" />
        ) : cached ? (
          <span className="text-[10px] text-purple-300/70 font-mono">
            {t.review.coach.cached}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap line-clamp-5">
        <CoachSanText text={explanation} side={move?.sideToMove} />
      </p>
      <div className="flex items-center justify-between pt-1 border-t border-purple-500/20 gap-2">
        <span className="text-[10px] text-slate-500 italic">
          {t.review.coach.disclaimer}
        </span>
        {limit !== null && remaining !== null ? (
          <span className="text-[10px] text-purple-300/80 font-mono shrink-0">
            {t.review.coach.quotaRemaining
              .replace("{remaining}", String(remaining))
              .replace("{limit}", String(limit))}
          </span>
        ) : limit === null ? (
          <span className="text-[10px] text-amber-300/80 shrink-0">
            {t.review.coach.unlimited}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (coach.status === "ready" && coach.explanation) {
    return analysisCard(
      coach.explanation,
      coach.remaining,
      coach.limit,
      coach.cached
    );
  }

  if ((coach.status === "idle" || coach.status === "loading") && sticky) {
    return analysisCard(
      sticky.explanation,
      sticky.remaining,
      sticky.limit,
      sticky.cached,
      true
    );
  }

  if (coach.status === "idle" || coach.status === "loading") {
    return (
      <div className="rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t.review.coach.loading}
      </div>
    );
  }

  const code = coach.error;
  const isQuota = code === "QUOTA_EXCEEDED";
  const isAuth = code === "NOT_AUTHENTICATED";

  let message: string;
  if (isQuota) {
    const used = Math.min(
      coach.used ?? coach.limit ?? 10,
      coach.limit ?? 10
    );
    message = t.review.coach.quotaReached
      .replace("{used}", String(used))
      .replace("{limit}", String(coach.limit ?? "?"));
  } else if (isAuth) {
    message = t.review.coach.loginRequired;
  } else if (code === "OPENAI_KEY_MISSING") {
    message = t.review.coach.openaiKeyMissing;
  } else if (code === "SUPABASE_NOT_CONFIGURED") {
    message = t.review.coach.supabaseNotConfigured;
  } else if (code === "OPENAI_ERROR") {
    message = t.review.coach.openaiError;
  } else if (code === "RATE_LIMITED") {
    message = t.review.coach.rateLimited;
  } else if (code === "NETWORK") {
    message = t.review.coach.network;
  } else if (code === "INVALID_BODY") {
    message = t.review.coach.invalidBody;
  } else {
    message = t.review.coach.unavailable;
  }

  return (
    <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 space-y-2">
      <p className="text-xs text-red-200">{message}</p>
      {coach.detail && (
        <p className="text-[10px] text-red-300/70 font-mono break-words">
          {coach.detail}
        </p>
      )}
      <div className="flex gap-2">
        {isQuota && onRequestUpgrade && (
          <Button
            size="sm"
            onClick={onRequestUpgrade}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {t.review.coach.upgradeCta}
          </Button>
        )}
        {!isQuota && !isAuth && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClick}
            className="border-red-500/40 text-red-200 hover:bg-red-500/10"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5 mr-1.5" />
            {t.review.coach.retry}
          </Button>
        )}
      </div>
    </div>
  );
}
