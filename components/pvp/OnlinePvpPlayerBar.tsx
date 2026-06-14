"use client";

import { useMemo } from "react";
import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import type { Language } from "@/lib/i18n";
import AccountAvatar from "@/components/AccountAvatar";
import { accountProfileInitials } from "@/lib/account-profile";
import { usePvpClockDisplay } from "@/hooks/usePvpClockDisplay";

type OnlinePvpPlayerBarProps = {
  side: "white" | "black";
  displayName: string;
  avatarUrl?: string | null;
  game: PvpGameRow;
  chess: Chess;
  myRole: "white" | "black" | null;
  lang: Language;
  isActiveSide?: boolean;
};

export default function OnlinePvpPlayerBar({
  side,
  displayName,
  avatarUrl,
  game,
  chess,
  myRole,
  lang,
  isActiveSide,
}: OnlinePvpPlayerBarProps) {
  const clock = usePvpClockDisplay({ game, chess, myRole, lang });
  const isWhite = side === "white";
  const isActive = isActiveSide ?? (isWhite ? clock.active === "w" : clock.active === "b");
  const isMine = myRole === side;
  const urgent = isWhite ? clock.whiteUrgent : clock.blackUrgent;
  const timeLabel = isWhite ? clock.formatWhite() : clock.formatBlack();

  const barClass = useMemo(() => {
    const base = "pvp-player-bar flex items-center justify-between gap-3 px-3 py-2 rounded-md";
    if (urgent) {
      return `${base} bg-red-950/90 ring-2 ring-red-500/70 animate-pvp-clock-shake`;
    }
    if (isActive && clock.showClocks) {
      return `${base} bg-slate-700/90 ring-1 ring-cyan-400/50`;
    }
    return `${base} bg-slate-800/90`;
  }, [urgent, isActive, clock.showClocks]);

  return (
    <div className={barClass}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-600 bg-gradient-to-br from-cyan-600 to-blue-800">
          <AccountAvatar
            src={avatarUrl}
            alt={displayName}
            initials={accountProfileInitials(displayName)}
            sizes="36px"
            className="text-[10px]"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100 truncate">{displayName}</p>
          {isMine && (
            <p className="text-[10px] text-cyan-400/80 truncate">
              {isWhite ? "♔" : "♚"}
            </p>
          )}
        </div>
      </div>
      <div
        className={`shrink-0 rounded px-2.5 py-1 font-mono text-base tabular-nums ${
          urgent
            ? "bg-red-900/60 text-red-300 font-bold"
            : isActive && clock.showClocks
              ? "bg-slate-900/80 text-slate-50"
              : "bg-slate-900/50 text-slate-400"
        }`}
      >
        {clock.showClocks ? timeLabel : "—"}
      </div>
    </div>
  );
}
