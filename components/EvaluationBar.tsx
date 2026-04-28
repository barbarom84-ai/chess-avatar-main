"use client";

import { useLanguage } from "@/lib/language-context";

interface EvaluationBarProps {
  /** Stockfish-style eval in pawns from White's perspective */
  evaluation: number | null;
}

type WhitePovVerdict =
  | "equal"
  | "whiteSlight"
  | "whiteClear"
  | "whiteWinning"
  | "blackSlight"
  | "blackClear"
  | "blackWinning";

function whitePovVerdict(evalWhite: number): WhitePovVerdict {
  if (evalWhite >= 3) return "whiteWinning";
  if (evalWhite >= 2) return "whiteClear";
  if (evalWhite >= 1) return "whiteSlight";
  if (evalWhite <= -3) return "blackWinning";
  if (evalWhite <= -2) return "blackClear";
  if (evalWhite <= -1) return "blackSlight";
  return "equal";
}

export default function EvaluationBar({ evaluation }: EvaluationBarProps) {
  const { t } = useLanguage();

  if (evaluation === null) {
    return (
      <div className="w-full h-6 bg-slate-800 rounded-lg flex items-center justify-center">
        <span className="text-xs text-slate-500">{t.evaluationBar.evaluating}</span>
      </div>
    );
  }

  const displayEval = evaluation;
  const clampedEval = Math.max(-10, Math.min(10, displayEval));
  const percentage = ((clampedEval + 10) / 20) * 100;
  const verdict = whitePovVerdict(displayEval);
  let verdictLabel: string;
  switch (verdict) {
    case "equal":
      verdictLabel = t.evaluationBar.equal;
      break;
    case "whiteSlight":
      verdictLabel = t.evaluationBar.whiteSlight;
      break;
    case "whiteClear":
      verdictLabel = t.evaluationBar.whiteClear;
      break;
    case "whiteWinning":
      verdictLabel = t.evaluationBar.whiteWinning;
      break;
    case "blackSlight":
      verdictLabel = t.evaluationBar.blackSlight;
      break;
    case "blackClear":
      verdictLabel = t.evaluationBar.blackClear;
      break;
    default:
      verdictLabel = t.evaluationBar.blackWinning;
  }

  const centerTone =
    verdict === "equal"
      ? "text-amber-300"
      : verdict.startsWith("white")
        ? "text-white drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]"
        : "text-slate-300";

  return (
    <div className="space-y-2">
      <div className="relative w-full h-8 bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-0 right-0 h-full bg-gradient-to-l from-slate-800 to-slate-700"
          style={{ width: `${100 - percentage}%` }}
        />
        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-500/50 -ml-0.5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${centerTone}`}>
            {evaluation > 0 ? "+" : ""}
            {evaluation.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
          <span className="text-slate-400">{t.evaluationBar.black}</span>
        </div>

        <span
          className={
            verdict === "equal"
              ? "text-amber-400 font-semibold text-center px-1"
              : verdict.startsWith("white")
                ? "text-cyan-400 font-semibold text-center px-1"
                : "text-red-400 font-semibold text-center px-1"
          }
        >
          {verdictLabel}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">{t.evaluationBar.white}</span>
          <div className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-400" />
        </div>
      </div>
    </div>
  );
}
