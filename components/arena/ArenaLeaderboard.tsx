"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Medal, Trash2 } from "lucide-react";
import { useArenaRatings } from "@/hooks/useArenaRatings";
import {
  ARENA_RATING_PROVISIONAL_GAMES,
  arenaLeaderboard,
  resetArenaRatings,
} from "@/lib/arena-rating";
import { HUMAN_KEY_PREFIX } from "@/lib/arena-humans";
import { useLanguage } from "@/lib/language-context";

const COLLAPSED_ROWS = 10;

export default function ArenaLeaderboard({
  locked = false,
  humansOnly = false,
}: {
  locked?: boolean;
  /** Same shared ratings, filtered to local human players. */
  humansOnly?: boolean;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const ratings = useArenaRatings();
  const rows = useMemo(() => {
    const all = arenaLeaderboard(ratings);
    return humansOnly ? all.filter((p) => p.key.startsWith(HUMAN_KEY_PREFIX)) : all;
  }, [ratings, humansOnly]);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);

  const reset = () => {
    if (window.confirm(ap.leaderboardResetConfirm)) resetArenaRatings();
  };

  return (
    <section className="arena-panel" data-testid="arena-leaderboard">
      <button
        type="button"
        className="arena-collapsible-trigger"
        aria-expanded={open}
        aria-controls="arena-leaderboard-body"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-400" />
          {humansOnly ? ap.leaderboardHumansTitle : ap.leaderboardTitle}
          {rows.length > 0 && (
            <span className="text-xs font-normal text-slate-500">({rows.length})</span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div id="arena-leaderboard-body" className="space-y-2 border-t border-slate-800 px-3 pb-3 pt-2">
          <p className="text-[11px] text-slate-500">{ap.leaderboardHint}</p>
          {rows.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">{ap.leaderboardEmpty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="arena-leaderboard">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">{ap.leaderboardAvatar}</th>
                    <th scope="col">{ap.arenaElo}</th>
                    <th scope="col">{ap.leaderboardGames}</th>
                    <th scope="col" title={ap.leaderboardRecordHint}>
                      {ap.leaderboardRecord}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p, i) => (
                    <tr key={p.key}>
                      <td className="text-slate-500">{i + 1}</td>
                      <td className="max-w-[12rem] truncate text-slate-200">
                        {p.name}
                        {!humansOnly && p.key.startsWith(HUMAN_KEY_PREFIX) && (
                          <span className="arena-platform ml-1.5" data-platform="human">
                            {ap.platformHumanShort}
                          </span>
                        )}
                      </td>
                      <td className="font-semibold text-slate-100">
                        {p.rating}
                        {p.games < ARENA_RATING_PROVISIONAL_GAMES && (
                          <span className="text-slate-500" title={ap.leaderboardProvisional}>
                            ?
                          </span>
                        )}
                      </td>
                      <td>{p.games}</td>
                      <td className="whitespace-nowrap">
                        <span className="text-emerald-400">{p.wins}</span>
                        {" / "}
                        <span className="text-slate-400">{p.draws}</span>
                        {" / "}
                        <span className="text-red-400">{p.losses}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > COLLAPSED_ROWS && (
              <button type="button" className="arena-icon-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? ap.showLess : ap.showMore.replace("{n}", String(rows.length - COLLAPSED_ROWS))}
              </button>
            )}
            {rows.length > 0 && (
              <button
                type="button"
                className="arena-icon-btn ml-auto"
                onClick={reset}
                disabled={locked}
              >
                <Trash2 className="h-4 w-4" />
                <span>{ap.leaderboardReset}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
