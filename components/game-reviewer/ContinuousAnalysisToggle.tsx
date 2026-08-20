"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface ContinuousAnalysisToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function ContinuousAnalysisToggle({
  enabled,
  disabled = false,
  onToggle,
}: ContinuousAnalysisToggleProps) {
  const { t } = useLanguage();
  const label = enabled
    ? t.review.continuousAnalysis.toggleActive
    : t.review.continuousAnalysis.toggle;

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      className={
        enabled
          ? "h-8 shrink-0 max-w-full bg-amber-600 hover:bg-amber-500 text-white px-2 sm:px-3"
          : "h-8 shrink-0 max-w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-2 sm:px-3"
      }
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      <Search className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" />
      <span className="hidden sm:inline truncate">{label}</span>
    </Button>
  );
}
