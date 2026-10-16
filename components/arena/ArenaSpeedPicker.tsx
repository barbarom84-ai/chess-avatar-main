"use client";

import { Gauge } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { ARENA_SPEEDS, type ArenaSpeed } from "@/lib/arena-move-timing";

export default function ArenaSpeedPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ArenaSpeed;
  onChange: (speed: ArenaSpeed) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const labels: Record<ArenaSpeed, string> = {
    fast: ap.speedFast,
    normal: ap.speedNormal,
    realistic: ap.speedRealistic,
  };

  return (
    <div className="arena-setting" title={ap.speedHint}>
      <span className="arena-setting__label" id="arena-speed-label">
        <Gauge className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        {ap.speedLabel}
      </span>
      <div
        role="radiogroup"
        aria-labelledby="arena-speed-label"
        className="arena-segmented"
      >
        {ARENA_SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            role="radio"
            aria-checked={value === speed}
            disabled={disabled}
            data-active={value === speed}
            className="arena-segmented__item"
            onClick={() => onChange(speed)}
          >
            {labels[speed]}
          </button>
        ))}
      </div>
    </div>
  );
}
