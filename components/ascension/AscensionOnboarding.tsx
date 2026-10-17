"use client";

import { useState } from "react";
import { Map, Sparkles, Star, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

export const ASCENSION_ONBOARDING_KEY = "ascension_onboarding_v1";

const STEPS = [
  { icon: Map, titleKey: "onboardingPathTitle" as const, bodyKey: "onboardingPathBody" as const },
  { icon: Sparkles, titleKey: "onboardingSkillsTitle" as const, bodyKey: "onboardingSkillsBody" as const },
  { icon: Star, titleKey: "onboardingBonusTitle" as const, bodyKey: "onboardingBonusBody" as const },
  { icon: Trophy, titleKey: "onboardingCardTitle" as const, bodyKey: "onboardingCardBody" as const },
];

interface AscensionOnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

export default function AscensionOnboarding({ open, onDismiss }: AscensionOnboardingProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  if (!open) return null;

  const current = STEPS[step]!;
  const Icon = current.icon;
  const isLast = step >= STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ascension-onboarding-title"
        className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-slate-950 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-cyan-300" />
            <h2 id="ascension-onboarding-title" className="text-sm font-semibold text-slate-100">
              {t.ascension[current.titleKey]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-200"
            aria-label={t.ascension.onboardingSkip}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{t.ascension[current.bodyKey]}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full ${i === step ? "bg-cyan-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              {t.ascension.onboardingSkip}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (isLast) onDismiss();
                else setStep((s) => s + 1);
              }}
            >
              {isLast ? t.ascension.onboardingDone : t.ascension.onboardingNext}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
