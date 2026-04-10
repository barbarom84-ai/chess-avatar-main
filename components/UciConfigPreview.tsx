"use client";

import { useMemo } from "react";
import { Terminal } from "lucide-react";

function highlightSetoptionLine(line: string) {
  const marker = " value ";
  const idx = line.lastIndexOf(marker);
  if (idx === -1) {
    return <span className="text-slate-200">{line}</span>;
  }
  const head = line.slice(0, idx);
  const tail = line.slice(idx + marker.length);
  const prefix = "setoption name ";
  const lower = head.toLowerCase();
  const pi = lower.indexOf(prefix);
  if (pi === -1) {
    return <span className="text-slate-200">{line}</span>;
  }
  const optName = head.slice(pi + prefix.length);
  const lead = head.slice(0, pi);
  return (
    <span className="break-all">
      {lead}
      <span className="text-violet-400">setoption name </span>
      <span className="text-cyan-300/95">{optName}</span>
      <span className="text-slate-500">{marker}</span>
      <span className="text-amber-300/95">{tail}</span>
    </span>
  );
}

function HighlightedLine({ line }: { line: string }) {
  const t = line.trimStart();
  if (t === "") {
    return <span className="text-transparent"> </span>;
  }
  if (t.startsWith("#")) {
    return <span className="text-slate-500">{line}</span>;
  }
  const lower = t.toLowerCase();
  if (lower.startsWith("setoption ")) {
    return highlightSetoptionLine(line);
  }
  if (lower.startsWith("go ")) {
    const i = line.toLowerCase().indexOf("go ");
    const rest = line.slice(i + 3);
    return (
      <span className="break-all">
        {line.slice(0, i)}
        <span className="text-emerald-400">go</span>
        <span className="text-emerald-300/90"> {rest}</span>
      </span>
    );
  }
  return <span className="text-slate-200">{line}</span>;
}

export interface UciConfigPreviewProps {
  content: string;
  windowTitle: string;
  subtitle?: string;
}

export function UciConfigPreview({
  content,
  windowTitle,
  subtitle
}: UciConfigPreviewProps) {
  const lines = useMemo(() => content.split("\n"), [content]);

  return (
    <div className="overflow-hidden rounded-xl border border-cyan-500/25 bg-[#0c1222] shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]">
      <div className="flex items-center gap-2 border-b border-slate-800/90 bg-slate-950/80 px-3 py-2">
        <div className="flex gap-1.5 pl-0.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]/90" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]/90" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]/90" />
        </div>
        <Terminal className="h-3.5 w-3.5 shrink-0 text-cyan-500/70" aria-hidden />
        <div className="min-w-0 flex-1 text-center">
          <span className="font-mono text-[11px] tracking-wide text-slate-400">
            {windowTitle}
          </span>
        </div>
        <div className="w-14 shrink-0" aria-hidden />
      </div>
      {subtitle ? (
        <p className="border-b border-slate-800/60 px-3 py-1.5 text-[11px] text-slate-500">
          {subtitle}
        </p>
      ) : null}
      <div className="max-h-[min(420px,50vh)] overflow-auto p-0 font-mono text-[13px] leading-relaxed">
        <div className="min-w-0 p-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="grid grid-cols-[2.25rem_1fr] gap-x-2"
            >
              <span className="select-none text-right text-[11px] text-slate-600 tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 border-l border-slate-700/40 pl-2">
                <HighlightedLine line={line} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
