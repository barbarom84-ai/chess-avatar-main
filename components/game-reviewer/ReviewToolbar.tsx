"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Download,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import ContinuousAnalysisToggle from "./ContinuousAnalysisToggle";
import type { ReviewStatus } from "@/hooks/useGameReview";
import type { AnalysisStrictnessId } from "@/lib/analysis-profiles";
import type { CoachToneId } from "@/lib/coach-tone";
import { useLanguage } from "@/lib/language-context";

const FREE_ENGINE_DEPTH = 12;
const PREMIUM_DEPTH_OPTIONS = [14, 18, 22] as const;

interface ReviewToolbarProps {
  analysisStrictness: AnalysisStrictnessId;
  onStrictnessChange: (v: AnalysisStrictnessId) => void;
  isPremium: boolean;
  premiumDepth: number;
  onPremiumDepthChange: (v: number) => void;
  coachTone: CoachToneId;
  onCoachToneChange: (v: CoachToneId) => void;
  effectiveStatus: ReviewStatus;
  reviewStatus: ReviewStatus;
  cacheChecked: boolean;
  hasCachedResult: boolean;
  engineReady: boolean;
  progress: number;
  total: number;
  onCancel: () => void;
  onStartAnalysis: () => void;
  onRelaunch: () => void;
  onDownloadAnnotated: () => void;
  showSavedInGamesList: boolean;
  canSaveToGames: boolean;
  onSaveToGames: () => void;
  saveBusy: boolean;
  continuousEnabled: boolean;
  onContinuousToggle: () => void;
}

export default function ReviewToolbar({
  analysisStrictness,
  onStrictnessChange,
  isPremium,
  premiumDepth,
  onPremiumDepthChange,
  coachTone,
  onCoachToneChange,
  effectiveStatus,
  reviewStatus,
  cacheChecked,
  hasCachedResult,
  engineReady,
  progress,
  total,
  onCancel,
  onStartAnalysis,
  onRelaunch,
  onDownloadAnnotated,
  showSavedInGamesList,
  canSaveToGames,
  onSaveToGames,
  saveBusy,
  continuousEnabled,
  onContinuousToggle,
}: ReviewToolbarProps) {
  const { t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  const strictnessSelectClass =
    "w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

  const renderActions = () => {
    if (effectiveStatus === "error") {
      return <span className="text-xs text-red-300">{t.review.error}</span>;
    }

    if (effectiveStatus === "done") {
      return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="text-xs text-emerald-300 flex items-center gap-1 mr-1">
            <Crown className="h-3 w-3" />
            <span className="hidden sm:inline">{t.review.done}</span>
          </span>
          <ContinuousAnalysisToggle
            enabled={continuousEnabled}
            onToggle={onContinuousToggle}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
            onClick={onDownloadAnnotated}
            title={t.review.downloadAnnotated}
          >
            <Download className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline text-xs">{t.review.downloadAnnotated}</span>
          </Button>
          {showSavedInGamesList && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-emerald-300"
              title={t.review.savedInGamesList}
              disabled
            >
              <Check className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">{t.review.savedInGamesList}</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
            onClick={onRelaunch}
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline text-xs">{t.review.relaunch}</span>
          </Button>
        </div>
      );
    }

    if (!cacheChecked) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
          {t.review.engineLoading}
        </div>
      );
    }

    if (!hasCachedResult) {
      if (reviewStatus === "running") {
        return (
          <div className="flex flex-col gap-1 min-w-[12rem] flex-1 max-w-md">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <ContinuousAnalysisToggle
                  enabled={continuousEnabled}
                  onToggle={onContinuousToggle}
                />
                <span className="truncate">
                  {t.review.analyzing
                    .replace("{n}", String(progress))
                    .replace("{total}", String(total))}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-red-300 hover:text-red-100 hover:bg-red-500/10 shrink-0"
                onClick={onCancel}
              >
                <Square className="h-3 w-3" />
              </Button>
            </div>
            <Progress value={pct} className="h-1" />
          </div>
        );
      }
      if (reviewStatus === "cancelled") {
        return <span className="text-xs text-yellow-300">{t.review.cancelled}</span>;
      }
      if (reviewStatus === "idle" || reviewStatus === "engine-loading") {
        if (!engineReady) {
          return (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              {t.review.engineLoading}
            </div>
          );
        }
        if (reviewStatus === "idle") {
          return (
            <div className="flex items-center gap-1.5">
              <ContinuousAnalysisToggle
                enabled={continuousEnabled}
                onToggle={onContinuousToggle}
              />
              <Button
                size="sm"
                className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={onStartAnalysis}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {t.review.startAnalysis}
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
            {t.review.engineLoading}
          </div>
        );
      }
    }

    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
        {t.review.engineLoading}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-cyan-500/25 bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-slate-300 hover:text-cyan-200 hover:bg-slate-800"
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">
              {settingsOpen ? t.review.layout.settingsCollapse : t.review.layout.settingsToggle}
            </span>
            {settingsOpen ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </Button>
          {canSaveToGames && !showSavedInGamesList && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
              onClick={onSaveToGames}
              disabled={saveBusy}
              title={t.review.saveToCloudButton}
            >
              {saveBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
              ) : (
                <Save className="h-3.5 w-3.5 sm:mr-1" />
              )}
              <span className="text-xs">{t.review.saveToCloudButton}</span>
            </Button>
          )}
          {showSavedInGamesList && (
            <span className="text-xs text-emerald-300 flex items-center gap-1 px-1">
              <Check className="h-3.5 w-3.5" />
              <span>{t.review.savedInGamesList}</span>
            </span>
          )}
        </div>
        <div className="flex-1 flex justify-end min-w-0">{renderActions()}</div>
      </div>

      {settingsOpen && (
        <div className="border-t border-slate-700/80 px-2 py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.strictnessLabel}
            </Label>
            <select
              className={strictnessSelectClass}
              value={analysisStrictness}
              onChange={(e) => onStrictnessChange(e.target.value as AnalysisStrictnessId)}
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
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.depthLabel}
            </Label>
            {isPremium ? (
              <select
                className={strictnessSelectClass}
                value={premiumDepth}
                onChange={(e) => onPremiumDepthChange(Number(e.target.value))}
                title={t.review.analysisSettings.depthHintPremium}
              >
                {PREMIUM_DEPTH_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t.review.analysisSettings.depthOption.replace("{n}", String(d))}
                  </option>
                ))}
              </select>
            ) : (
              <p
                className="mt-1 text-xs text-slate-400 py-1.5"
                title={t.review.analysisSettings.depthLocked.replace(
                  "{n}",
                  String(FREE_ENGINE_DEPTH)
                )}
              >
                {t.review.analysisSettings.depthLocked.replace(
                  "{n}",
                  String(FREE_ENGINE_DEPTH)
                )}
              </p>
            )}
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.coachToneLabel}
            </Label>
            <select
              className={strictnessSelectClass}
              value={coachTone}
              onChange={(e) => onCoachToneChange(e.target.value as CoachToneId)}
            >
              <option value="pedagogical">{t.review.analysisSettings.coachTonePedagogical}</option>
              <option value="concise">{t.review.analysisSettings.coachToneConcise}</option>
              <option value="witty">{t.review.analysisSettings.coachToneWitty}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
