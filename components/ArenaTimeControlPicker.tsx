"use client";

import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { ARENA_TIME_PRESETS } from "@/lib/arena-time-controls";

type ArenaTimeControlPickerProps = {
  value: string;
  onChange: (presetId: string) => void;
  disabled?: boolean;
};

export default function ArenaTimeControlPicker({
  value,
  onChange,
  disabled = false,
}: ArenaTimeControlPickerProps) {
  const { t } = useLanguage();
  const presetLabels = t.playOnline.presets as Record<string, string>;

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-slate-900/50 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
        <Label htmlFor="arena-time-preset" className="text-sm text-slate-200">
          {t.arenaPage.timeControlLabel}
        </Label>
      </div>
      <select
        id="arena-time-preset"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
      >
        {ARENA_TIME_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {presetLabels[p.id] ?? p.id}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-500 leading-snug">
        {t.arenaPage.adaptiveTimingHint}
      </p>
    </div>
  );
}
