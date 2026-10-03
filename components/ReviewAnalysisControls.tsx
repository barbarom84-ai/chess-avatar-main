"use client";

import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import {
  type AnalysisStrictnessId,
} from "@/lib/analysis-profiles";
import { type CoachToneId } from "@/lib/coach-tone";

const SELECT_CLASS =
  "h-7 max-w-[8.5rem] rounded-md border border-slate-700 bg-slate-950 px-1.5 text-[11px] text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

export default function ReviewAnalysisControls({
  analysisStrictness,
  onStrictnessChange,
  isPremium,
  premiumDepth,
  onPremiumDepthChange,
  freeDepth,
  premiumDepthOptions,
  coachTone,
  onCoachToneChange,
}: {
  analysisStrictness: AnalysisStrictnessId;
  onStrictnessChange: (value: AnalysisStrictnessId) => void;
  isPremium: boolean;
  premiumDepth: number;
  onPremiumDepthChange: (value: number) => void;
  freeDepth: number;
  premiumDepthOptions: readonly number[];
  coachTone: CoachToneId;
  onCoachToneChange: (value: CoachToneId) => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <Label className="sr-only">{t.review.analysisSettings.strictnessLabel}</Label>
      <select
        className={SELECT_CLASS}
        value={analysisStrictness}
        onChange={(e) =>
          onStrictnessChange(e.target.value as AnalysisStrictnessId)
        }
        aria-label={t.review.analysisSettings.strictnessLabel}
        title={
          analysisStrictness === "relaxed"
            ? t.review.analysisSettings.strictnessHintRelaxed
            : analysisStrictness === "standard"
              ? t.review.analysisSettings.strictnessHintStandard
              : t.review.analysisSettings.strictnessHintStrict
        }
      >
        <option value="relaxed">{t.review.analysisSettings.strictnessRelaxed}</option>
        <option value="standard">{t.review.analysisSettings.strictnessStandard}</option>
        <option value="strict">{t.review.analysisSettings.strictnessStrict}</option>
      </select>

      {isPremium ? (
        <>
          <Label className="sr-only">{t.review.analysisSettings.depthLabel}</Label>
          <select
            className={SELECT_CLASS}
            value={premiumDepth}
            onChange={(e) => onPremiumDepthChange(Number(e.target.value))}
            aria-label={t.review.analysisSettings.depthLabel}
            title={t.review.analysisSettings.depthHintPremium}
          >
            {premiumDepthOptions.map((d) => (
              <option key={d} value={d}>
                {t.review.analysisSettings.depthOption.replace("{n}", String(d))}
              </option>
            ))}
          </select>
        </>
      ) : (
        <span
          className="inline-flex h-7 items-center rounded-md border border-slate-800 bg-slate-950/80 px-2 text-[11px] text-slate-400"
          title={t.review.analysisSettings.depthLocked.replace("{n}", String(freeDepth))}
        >
          {t.review.analysisSettings.depthOption.replace("{n}", String(freeDepth))}
        </span>
      )}

      <Label className="sr-only">{t.review.analysisSettings.coachToneLabel}</Label>
      <select
        className={SELECT_CLASS}
        value={coachTone}
        onChange={(e) => onCoachToneChange(e.target.value as CoachToneId)}
        aria-label={t.review.analysisSettings.coachToneLabel}
      >
        <option value="pedagogical">{t.review.analysisSettings.coachTonePedagogical}</option>
        <option value="concise">{t.review.analysisSettings.coachToneConcise}</option>
        <option value="witty">{t.review.analysisSettings.coachToneWitty}</option>
      </select>
    </>
  );
}
