"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface GuideMetaPanelLabels {
  title: string;
  pathLabel: string;
  pathValue: string;
  filesLabel: string;
  files: readonly string[];
  cta: string;
  tipFritz: string;
  tipPack: string;
  tipSwap: string;
  tipHelp: string;
  tipAdvanced: string;
}

export default function GuideMetaPanel({
  variant,
  labels,
}: {
  variant: "fritz" | "pack" | "swap" | "help" | "advanced";
  labels: GuideMetaPanelLabels;
}) {
  const tip =
    variant === "fritz"
      ? labels.tipFritz
      : variant === "pack"
        ? labels.tipPack
        : variant === "swap"
          ? labels.tipSwap
          : variant === "help"
            ? labels.tipHelp
            : labels.tipAdvanced;

  return (
    <aside className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {labels.title}
      </h2>
      <p className="text-[11px] text-slate-500 leading-relaxed">{tip}</p>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {labels.pathLabel}
        </p>
        <code
          className="block text-[10px] text-cyan-200/90 bg-slate-950/80 border border-slate-800 rounded px-2 py-1.5 break-all leading-relaxed"
          data-testid="guide-engine-path"
        >
          {labels.pathValue}
        </code>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {labels.filesLabel}
        </p>
        <ul className="text-[11px] text-slate-400 space-y-0.5">
          {labels.files.map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <span className="text-cyan-600 mt-0.5" aria-hidden>
                •
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button asChild size="sm" className="w-full bg-cyan-700 hover:bg-cyan-600">
        <Link href="/analyze" data-testid="guide-cta-analyze">
          {labels.cta}
        </Link>
      </Button>
    </aside>
  );
}
