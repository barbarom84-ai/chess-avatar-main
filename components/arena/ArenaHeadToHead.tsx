"use client";

import { History } from "lucide-react";
import { arenaEntrant, useArenaRatings } from "@/hooks/useArenaRatings";
import { headToHead } from "@/lib/arena-rating";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";

/** Arena Elo of both avatars and their record against each other in this browser. */
export default function ArenaHeadToHead({ a, b }: { a?: ProfileOption; b?: ProfileOption }) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const ratings = useArenaRatings();
  if (!a || !b) return null;

  const ea = arenaEntrant(a);
  const eb = arenaEntrant(b);
  if (ea.key === eb.key) return null;
  const pa = ratings.players[ea.key];
  const pb = ratings.players[eb.key];
  const rec = headToHead(ratings, ea.key, eb.key);
  const played = rec.aWins + rec.bWins + rec.draws;

  return (
    <section className="arena-panel arena-h2h" aria-label={ap.h2hTitle} data-testid="arena-h2h">
      <p className="arena-setting__label">
        <History className="h-3.5 w-3.5 text-slate-400" />
        {ap.h2hTitle}
      </p>
      <div className="arena-h2h__row">
        <span className="truncate text-cyan-300">{ea.name}</span>
        <strong className="tabular-nums text-slate-100">
          {played > 0 ? `${rec.aWins} – ${rec.bWins}` : "—"}
        </strong>
        <span className="truncate text-right text-amber-300">{eb.name}</span>
      </div>
      <div className="arena-h2h__row text-[11px] text-slate-500">
        <span className="tabular-nums">
          {ap.arenaElo} {pa ? pa.rating : "—"}
        </span>
        <span>
          {played > 0
            ? ap.h2hDraws.replace("{n}", String(rec.draws))
            : ap.h2hNone}
        </span>
        <span className="text-right tabular-nums">
          {ap.arenaElo} {pb ? pb.rating : "—"}
        </span>
      </div>
    </section>
  );
}
