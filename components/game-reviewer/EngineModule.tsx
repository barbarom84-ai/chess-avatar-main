"use client";

import EvaluationBar from "@/components/EvaluationBar";
import ContinuousAnalysisPanel from "./ContinuousAnalysisPanel";
import type { ContinuousAnalysisDisplay } from "@/hooks/useContinuousAnalysis";

interface EngineModuleProps {
  evaluation: number | null;
  continuousEnabled: boolean;
  engineReady: boolean;
  isAnalyzing: boolean;
  paused: boolean;
  display: ContinuousAnalysisDisplay | null;
}

export default function EngineModule({
  evaluation,
  continuousEnabled,
  engineReady,
  isAnalyzing,
  paused,
  display,
}: EngineModuleProps) {
  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <EvaluationBar evaluation={evaluation} compact />
      <div className="flex-1 min-h-0">
        <ContinuousAnalysisPanel
          enabled={continuousEnabled}
          engineReady={engineReady}
          isAnalyzing={isAnalyzing}
          paused={paused}
          display={display}
          compact
        />
      </div>
    </div>
  );
}
