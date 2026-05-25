"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AscensionProgressPath from "@/components/ascension/AscensionProgressPath";
import AscensionRewardModal, {
  type AscensionRewardData,
} from "@/components/ascension/AscensionRewardModal";
import AscensionGate from "@/components/ascension/AscensionGate";
import ChampionTradingCard from "@/components/ascension/ChampionTradingCard";
import AscensionPuzzlePlayer from "@/components/ascension/AscensionPuzzlePlayer";
import SkillTreePanel from "@/components/ascension/SkillTreePanel";
import { dbCardToModel } from "@/lib/ascension/card-model";
import {
  completeAscensionPuzzle,
  fetchAscensionPuzzles,
  fetchAscensionState,
  initAscension,
  unlockAscensionSkill,
  updateChampionCard,
  type AscensionPuzzleListItem,
} from "@/lib/ascension/client";
import { firstOpenPuzzleIndex } from "@/lib/ascension/progress-path";
import type { ChampionTier, DbPlayerChampionCard } from "@/lib/ascension/types";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";
import { track } from "@/lib/track";

type PendingAdvance = {
  toIndex: number;
  nextPuzzleId: string | null;
};

function sortPuzzles(puzzles: AscensionPuzzleListItem[]) {
  return [...puzzles].sort((a, b) => a.sort_order - b.sort_order);
}

export default function AscensionPageClient() {
  const { t } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [card, setCard] = useState<DbPlayerChampionCard | null>(null);
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [puzzles, setPuzzles] = useState<AscensionPuzzleListItem[]>([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [pendingReward, setPendingReward] = useState<AscensionRewardData | null>(null);
  const [progressNodeIndex, setProgressNodeIndex] = useState(0);
  const [animateToIndex, setAnimateToIndex] = useState<number | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState<PendingAdvance | null>(null);
  const [puzzleSessionKey, setPuzzleSessionKey] = useState(0);
  const progressInitialized = useRef(false);

  const sortedPuzzles = useMemo(() => sortPuzzles(puzzles), [puzzles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initAscension();
      const state = await fetchAscensionState();
      setCard(state.card);
      setUnlockedSkills(state.unlockedSkills);
      const puzzleData = await fetchAscensionPuzzles();
      setPuzzles(puzzleData.puzzles);
      if (!selectedPuzzleId && puzzleData.puzzles[0]) {
        const sorted = sortPuzzles(puzzleData.puzzles);
        const openIdx = firstOpenPuzzleIndex(sorted);
        setSelectedPuzzleId(sorted[openIdx]?.id ?? puzzleData.puzzles[0].id);
      }
      if (!progressInitialized.current) {
        const sorted = sortPuzzles(puzzleData.puzzles);
        setProgressNodeIndex(firstOpenPuzzleIndex(sorted));
        progressInitialized.current = true;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.ascension.loadError);
    } finally {
      setLoading(false);
    }
  }, [selectedPuzzleId, t.ascension.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPuzzle = puzzles.find((p) => p.id === selectedPuzzleId) ?? sortedPuzzles[0];

  const handleComplete = useCallback(
    async (moves: string[], timeMs: number) => {
      if (!selectedPuzzle || !card || pendingReward) return false;
      try {
        const previousTier = card.tier as ChampionTier;
        const completedIdx = sortedPuzzles.findIndex((p) => p.id === selectedPuzzle.id);
        const result = await completeAscensionPuzzle(selectedPuzzle.id, moves, timeMs);
        if (result.solved && result.card && result.rewards) {
          setCard(result.card);
          track("ascension_puzzle_complete", {
            puzzleId: selectedPuzzle.id,
            kind: selectedPuzzle.kind,
            eloAfter: result.card.elo,
          });

          setPuzzles((prev) =>
            prev.map((p) => (p.id === selectedPuzzle.id ? { ...p, completed: true } : p))
          );

          const nextPuzzle = sortedPuzzles[completedIdx + 1] ?? null;
          const shouldAdvance =
            completedIdx === progressNodeIndex && completedIdx < sortedPuzzles.length - 1;
          setPendingReward({
            xpGain: result.rewards.xpGain,
            eloGain: result.rewards.eloGain,
            newElo: result.rewards.newElo,
            newXp: result.rewards.newXp,
            newTier: result.rewards.newTier as ChampionTier,
            previousTier,
          });
          setPendingAdvance({
            toIndex: shouldAdvance ? completedIdx + 1 : progressNodeIndex,
            nextPuzzleId: shouldAdvance ? nextPuzzle?.id ?? null : null,
          });

          void fetchAscensionPuzzles().then((data) => setPuzzles(data.puzzles));
          return true;
        }
        return false;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.ascension.completeError);
        return false;
      }
    },
    [selectedPuzzle, card, pendingReward, sortedPuzzles, progressNodeIndex, t.ascension.completeError]
  );

  const handleRewardContinue = () => {
    if (!pendingAdvance) {
      setPendingReward(null);
      return;
    }

    setPendingReward(null);
    const { toIndex, nextPuzzleId } = pendingAdvance;

    if (toIndex !== progressNodeIndex) {
      setAnimateToIndex(toIndex);
    } else {
      if (nextPuzzleId && nextPuzzleId !== selectedPuzzleId) {
        setSelectedPuzzleId(nextPuzzleId);
      } else {
        setPuzzleSessionKey((k) => k + 1);
      }
      setPendingAdvance(null);
    }
  };

  const handlePathAnimationComplete = () => {
    if (!pendingAdvance) {
      setAnimateToIndex(null);
      return;
    }

    setProgressNodeIndex(pendingAdvance.toIndex);
    setAnimateToIndex(null);

    if (pendingAdvance.nextPuzzleId) {
      setSelectedPuzzleId(pendingAdvance.nextPuzzleId);
    }
    setPendingAdvance(null);
  };

  const handleUnlock = async (skillId: string) => {
    setUnlocking(skillId);
    try {
      const result = await unlockAscensionSkill(skillId);
      setCard(result.card);
      setUnlockedSkills((prev) => [...prev, result.unlockedSkillId]);
      toast.success(t.ascension.skillUnlocked);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.ascension.unlockError);
    } finally {
      setUnlocking(null);
    }
  };

  const handleCardUpdate = async (patch: Partial<DbPlayerChampionCard>) => {
    try {
      const updated = await updateChampionCard(patch);
      setCard(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.ascension.updateError);
    }
  };

  const cardModel = card ? dbCardToModel(card) : null;

  return (
    <AscensionGate>
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-100">{t.pages.ascension.title}</h1>
                <p className="text-slate-400 text-sm">{t.pages.ascension.subtitle}</p>
              </div>
              {isSuperUser && !superLoading && (
                <Link
                  href="/ascension/admin"
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/50"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {t.ascension.adminLink}
                </Link>
              )}
            </div>
          </header>

          {loading || !card || !cardModel ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <aside className="lg:col-span-4 space-y-4">
                <ChampionTradingCard model={cardModel} className="mx-auto" />
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <div className="space-y-1">
                    <Label htmlFor="champion-name">{t.ascension.displayName}</Label>
                    <Input
                      id="champion-name"
                      value={card.display_name}
                      onChange={(e) => setCard({ ...card, display_name: e.target.value })}
                      onBlur={() => void handleCardUpdate({ display_name: card.display_name })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.ascension.playStyle}</Label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                      value={card.class_key}
                      onChange={(e) => {
                        const v = e.target.value as DbPlayerChampionCard["class_key"];
                        setCard({ ...card, class_key: v });
                        void handleCardUpdate({ class_key: v });
                      }}
                    >
                      {Object.keys(t.avatarCard.playStyles).map((key) => (
                        <option key={key} value={key}>
                          {t.avatarCard.playStyles[key as keyof typeof t.avatarCard.playStyles]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t.ascension.element}</Label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                      value={card.element}
                      onChange={(e) => {
                        const v = e.target.value as DbPlayerChampionCard["element"];
                        setCard({ ...card, element: v });
                        void handleCardUpdate({ element: v });
                      }}
                    >
                      {Object.keys(t.avatarCard.elements).map((key) => (
                        <option key={key} value={key}>
                          {t.avatarCard.elements[key as keyof typeof t.avatarCard.elements]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </aside>

              <section className="lg:col-span-8 space-y-4">
                <AscensionProgressPath
                  puzzles={puzzles}
                  card={cardModel}
                  selectedPuzzleId={selectedPuzzle?.id ?? null}
                  onSelectPuzzle={setSelectedPuzzleId}
                  progressNodeIndex={progressNodeIndex}
                  animateToIndex={animateToIndex}
                  onAnimationComplete={handlePathAnimationComplete}
                />
                <Tabs defaultValue="puzzles">
                  <TabsList>
                    <TabsTrigger value="puzzles">{t.ascension.tabPuzzles}</TabsTrigger>
                    <TabsTrigger value="skills">{t.ascension.tabSkills}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="puzzles" className="mt-4">
                    {selectedPuzzle && (
                      <AscensionPuzzlePlayer
                        key={`${selectedPuzzle.id}-${puzzleSessionKey}`}
                        puzzle={selectedPuzzle}
                        unlockedSkills={unlockedSkills}
                        onComplete={handleComplete}
                        frozen={!!pendingReward || animateToIndex != null}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="skills" className="mt-4">
                    <SkillTreePanel
                      unlockedSkills={unlockedSkills}
                      currentXp={card.xp}
                      onUnlock={handleUnlock}
                      unlocking={unlocking}
                    />
                  </TabsContent>
                </Tabs>
              </section>
            </div>
          )}
        </div>
      </main>

      <AscensionRewardModal
        open={!!pendingReward}
        reward={pendingReward}
        onContinue={handleRewardContinue}
      />
    </AscensionGate>
  );
}

