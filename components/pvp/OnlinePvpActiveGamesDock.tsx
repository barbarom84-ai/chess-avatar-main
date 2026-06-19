"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import AccountAvatar from "@/components/AccountAvatar";
import { accountProfileInitials } from "@/lib/account-profile";
import type { ActivePvpGame } from "@/hooks/useOpenPvpLobbies";

export type OnlinePvpActiveGamesDockLabels = {
  title: string;
  yourTurn: string;
  anonymousPlayer: string;
  currentGame: string;
};

type OnlinePvpActiveGamesDockProps = {
  activeGames: ActivePvpGame[];
  currentGameId: string;
  presetLabels: Record<string, string>;
  labels: OnlinePvpActiveGamesDockLabels;
};

export default function OnlinePvpActiveGamesDock({
  activeGames,
  currentGameId,
  presetLabels,
  labels,
}: OnlinePvpActiveGamesDockProps) {
  if (activeGames.length === 0) return null;

  const showDock =
    activeGames.length > 1 || activeGames.some((g) => g.id !== currentGameId);
  if (!showDock) return null;

  return (
    <div
      className="fixed bottom-14 left-0 right-0 z-40 pointer-events-none px-2 md:px-4"
      role="navigation"
      aria-label={labels.title}
    >
      <div className="mx-auto max-w-3xl pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-800/80">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 shrink-0">
            {labels.title}
          </span>
          <span className="text-[10px] text-slate-500">
            {activeGames.length}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-2 py-2 scrollbar-thin">
          {activeGames.map((ag) => {
            const isCurrent = ag.id === currentGameId;
            const name = ag.opponent_display_name ?? labels.anonymousPlayer;
            const preset =
              presetLabels[ag.time_preset] ?? ag.time_preset.replace(/_/g, " ");
            return (
              <Link
                key={ag.id}
                href={`/online?game=${ag.id}`}
                className={cn(
                  "flex min-w-[9rem] max-w-[11rem] shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                  isCurrent
                    ? "border-cyan-500/60 bg-cyan-950/40 ring-1 ring-cyan-500/30"
                    : "border-slate-700 bg-slate-900/60 hover:bg-slate-800/80",
                  ag.is_my_turn && !isCurrent && "border-amber-500/50"
                )}
                aria-current={isCurrent ? "page" : undefined}
                title={
                  isCurrent
                    ? `${labels.currentGame}: ${name}`
                    : ag.is_my_turn
                      ? `${labels.yourTurn} — ${name}`
                      : name
                }
              >
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-600 bg-gradient-to-br from-cyan-700 to-blue-900">
                  <AccountAvatar
                    src={ag.opponent_avatar_url}
                    alt={name}
                    initials={accountProfileInitials(name)}
                    sizes="28px"
                    className="text-[9px]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-100">
                    {name}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">{preset}</p>
                </div>
                {ag.is_my_turn && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-[9px] px-1 py-0",
                      isCurrent ? "bg-cyan-800/80" : "bg-amber-900/80 text-amber-100"
                    )}
                  >
                    {labels.yourTurn}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
