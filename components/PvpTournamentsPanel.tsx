"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  listTournaments,
  joinTournament,
  getLeagueStandings,
  getDefaultLeagueId,
  type PvpTournament,
  type PvpLeagueStanding,
} from "@/lib/pvp-tournaments";
import { toast } from "sonner";

export default function PvpTournamentsPanel() {
  const { t } = useLanguage();
  const [tournaments, setTournaments] = useState<PvpTournament[]>([]);
  const [standings, setStandings] = useState<PvpLeagueStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tours] = await Promise.all([listTournaments()]);
    setTournaments(tours);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getDefaultLeagueId().then((id) => {
      if (id) void getLeagueStandings(id).then(setStandings);
    });
  }, []);

  const handleJoin = async (id: string) => {
    setJoining(id);
    const ok = await joinTournament(id);
    setJoining(null);
    if (ok) {
      toast.success(t.pvpTournaments.joined);
      void load();
    } else {
      toast.error(t.pvpTournaments.joinError);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/80 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-400" />
          {t.pvpTournaments.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tournaments.length === 0 ? (
          <p className="text-sm text-slate-500">{t.pvpTournaments.empty}</p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((tr) => (
              <li
                key={tr.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
              >
                <div>
                  <span className="font-medium text-slate-200">{tr.name}</span>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {tr.player_count ?? 0}/{tr.max_players}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {tr.status}
                    </Badge>
                  </div>
                </div>
                {tr.status === "registration" && (
                  <Button
                    size="sm"
                    disabled={joining === tr.id}
                    onClick={() => void handleJoin(tr.id)}
                  >
                    {joining === tr.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.pvpTournaments.join
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {standings.length > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-sm font-medium text-slate-400 mb-2">
              {t.pvpTournaments.leagueStandings}
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              {standings.slice(0, 5).map((s, i) => (
                <li key={s.user_id}>
                  #{i + 1} — {s.rating} ELO ({s.wins}W/{s.losses}L/{s.draws}D)
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
