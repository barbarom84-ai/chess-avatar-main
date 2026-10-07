import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
  accentClassName?: string;
};

export function StatTile({ icon: Icon, label, value, hint, small, accentClassName = "text-cyan-300" }: StatTileProps) {
  return (
    <div className="stat-tile">
      <p className="stat-tile-label">
        <Icon className={accentClassName} aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className={cn("stat-tile-value", small && "stat-tile-value--sm")} title={value}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="stat-tile space-y-2">
      <div className="account-skeleton h-3 w-20" />
      <div className="account-skeleton h-6 w-14" />
    </div>
  );
}
