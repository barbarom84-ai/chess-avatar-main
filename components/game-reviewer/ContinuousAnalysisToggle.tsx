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

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      className={
        enabled
          ? "h-8 bg-amber-600 hover:bg-amber-500 text-white"
          : "h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600"
      }
      onClick={onToggle}
      title={
        enabled
          ? t.review.continuousAnalysis.toggleActive
          : t.review.continuousAnalysis.toggle
      }
    >
      <Search className="h-3.5 w-3.5 mr-1.5" />
      {enabled
        ? t.review.continuousAnalysis.toggleActive
        : t.review.continuousAnalysis.toggle}
    </Button>
  );
}
