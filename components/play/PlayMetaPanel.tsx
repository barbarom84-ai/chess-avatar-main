"use client";

export interface PlayMetaPanelLabels {
  title: string;
  tipPersonalities: string;
  tipLibrary: string;
  tipOnline: string;
  tipGame: string;
}

export default function PlayMetaPanel({
  variant,
  labels,
}: {
  variant: "personalities" | "library" | "online" | "game";
  labels: PlayMetaPanelLabels;
}) {
  const tip =
    variant === "personalities"
      ? labels.tipPersonalities
      : variant === "library"
        ? labels.tipLibrary
        : variant === "online"
          ? labels.tipOnline
          : labels.tipGame;

  return (
    <aside className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/40 p-3 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {labels.title}
      </h2>
      <p className="text-[11px] text-slate-500 leading-relaxed">{tip}</p>
    </aside>
  );
}
