"use client";

import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import {
  PVP_CORRESPONDENCE_PRESETS,
  PVP_LIVE_PRESETS,
} from "@/lib/pvp-time-controls";

type OnlinePvpTimeControlGridProps = {
  value: string;
  onChange: (presetId: string) => void;
  disabled?: boolean;
};

export default function OnlinePvpTimeControlGrid({
  value,
  onChange,
  disabled = false,
}: OnlinePvpTimeControlGridProps) {
  const { t } = useLanguage();
  const o = t.playOnline;
  const presetLabels = o.presets as Record<string, string>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
          <Label className="text-sm text-slate-200">{o.quickPlay}</Label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PVP_LIVE_PRESETS.map((p) => {
            const selected = value === p.id;
            return (
              <Button
                key={p.id}
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={disabled}
                className={
                  selected
                    ? "h-auto py-2.5 flex-col gap-0.5"
                    : "h-auto py-2.5 flex-col gap-0.5 border-slate-700 bg-slate-900/60 hover:bg-slate-800/80"
                }
                onClick={() => onChange(p.id)}
              >
                <span className="text-sm font-semibold">{presetLabels[p.id] ?? p.id}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-400 shrink-0" aria-hidden />
          <Label className="text-sm text-slate-200">{o.presetGroups.correspondence}</Label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PVP_CORRESPONDENCE_PRESETS.map((p) => {
            const selected = value === p.id;
            return (
              <Button
                key={p.id}
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={disabled}
                className={
                  selected
                    ? "h-auto py-2"
                    : "h-auto py-2 border-slate-700 bg-slate-900/60 hover:bg-slate-800/80"
                }
                onClick={() => onChange(p.id)}
              >
                <span className="text-xs sm:text-sm">{presetLabels[p.id] ?? p.id}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
