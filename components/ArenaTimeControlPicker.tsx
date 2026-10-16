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
    <div className="arena-setting">
      <Label htmlFor="arena-time-preset" className="arena-setting__label">
        <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        {t.arenaPage.timeControlLabel}
      </Label>
      <select
        id="arena-time-preset"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="arena-select"
      >
        {ARENA_TIME_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {presetLabels[p.id] ?? p.id}
          </option>
        ))}
      </select>
    </div>
  );
}
