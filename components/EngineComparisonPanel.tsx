"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeftRight, Loader2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { getUserProfiles } from "@/lib/supabase-storage";
import type { DbProfile } from "@/lib/supabase";
import type { EngineConfig } from "@/lib/analysis";
import {
  engineOptionsForConfig,
  pickMoveFromLines,
  resolveAvatarBookMove,
} from "@/lib/engine-comparison";
import {
  stockfishClient,
  stockfishGetBestMoveAndEval,
} from "@/lib/stockfish-client";

const SimpleChessboard = dynamic(() => import("@/components/SimpleChessboard"), {
  ssr: false,
});

const START_FEN = "rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2";

interface SideResult {
  uci: string;
  eval: number | null;
  source: string;
}

export default function EngineComparisonPanel() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [fen, setFen] = useState(START_FEN);
  const [loading, setLoading] = useState(false);
  const [leftResult, setLeftResult] = useState<SideResult | null>(null);
  const [rightResult, setRightResult] = useState<SideResult | null>(null);

  useEffect(() => {
    void getUserProfiles().then(setProfiles);
    stockfishClient.acquire();
    return () => stockfishClient.release();
  }, []);

  const leftProfile = profiles.find((p) => p.id === leftId);
  const rightProfile = profiles.find((p) => p.id === rightId);

  const getMoveForProfile = useCallback(
    async (profile: DbProfile): Promise<SideResult> => {
      const config = profile.config as EngineConfig;
      const side = fen.split(" ")[1] === "b" ? "b" : "w";
      const bookMove = resolveAvatarBookMove(fen, config, side);
      if (bookMove) {
        return { uci: bookMove, eval: null, source: "book" };
      }
      const opts = engineOptionsForConfig(config);
      const { move, evalPawns } = await stockfishGetBestMoveAndEval(fen, opts.depth);
      const lineMap = new Map<number, string>([[1, move]]);
      const uci = pickMoveFromLines(move, lineMap, config);
      return {
        uci,
        eval: evalPawns != null ? Math.round(evalPawns * 100) : null,
        source: "engine",
      };
    },
    [fen]
  );

  const compare = async () => {
    if (!leftProfile || !rightProfile) return;
    setLoading(true);
    setLeftResult(null);
    setRightResult(null);
    try {
      const [left, right] = await Promise.all([
        getMoveForProfile(leftProfile),
        getMoveForProfile(rightProfile),
      ]);
      setLeftResult(left);
      setRightResult(right);
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setLeftId(rightId);
    setRightId(leftId);
    setLeftResult(null);
    setRightResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <select
          value={leftId}
          onChange={(e) => setLeftId(e.target.value)}
          className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
        >
          <option value="">{t.comparePage.selectLeft}</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username} ({(p.config as EngineConfig).elo} ELO)
            </option>
          ))}
        </select>
        <select
          value={rightId}
          onChange={(e) => setRightId(e.target.value)}
          className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
        >
          <option value="">{t.comparePage.selectRight}</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username} ({(p.config as EngineConfig).elo} ELO)
            </option>
          ))}
        </select>
      </div>

      <Input
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        placeholder={t.comparePage.fenPlaceholder}
        className="bg-slate-950 border-slate-700 font-mono text-sm"
      />

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => void compare()}
          disabled={!leftProfile || !rightProfile || loading}
          className="bg-cyan-600 hover:bg-cyan-500"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Swords className="h-4 w-4 mr-2" />
          )}
          {t.comparePage.playLeft} / {t.comparePage.playRight}
        </Button>
        <Button variant="outline" onClick={swap} disabled={!leftId || !rightId}>
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {t.comparePage.swap}
        </Button>
        <Button variant="ghost" onClick={() => setFen(START_FEN)}>
          {t.comparePage.startPosition}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[leftProfile, rightProfile].map((profile, idx) => {
          const result = idx === 0 ? leftResult : rightResult;
          const label = idx === 0 ? t.comparePage.selectLeft : t.comparePage.selectRight;
          return (
            <Card key={idx} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {profile?.username ?? label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SimpleChessboard position={fen} orientation="white" />
                <div className="text-center">
                  {loading ? (
                    <span className="text-slate-400 text-sm">{t.comparePage.analyzing}</span>
                  ) : result ? (
                    <div className="space-y-1">
                      <code className="text-cyan-300 text-lg">{result.uci}</code>
                      {result.eval != null && (
                        <p className="text-xs text-slate-500">
                          eval: {(result.eval / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm">{t.comparePage.noMove}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
