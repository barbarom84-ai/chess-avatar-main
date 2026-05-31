"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Pencil, Settings2 } from "lucide-react";
import AscensionLoadingScreen from "@/components/ascension/AscensionLoadingScreen";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { firstOpenStandardPuzzleIndex } from "@/lib/ascension/progress-path";
import {
  applyPuzzleLocks,
  isMainCampaignComplete,
} from "@/lib/ascension/campaign-puzzle-utils";
import type { ChampionTier, DbPlayerChampionCard } from "@/lib/ascension/types";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";
import { track } from "@/lib/track";

const SKIP_PATH_ANIM_KEY = "ascension_skip_path_anim";

function shouldSkipPathAnim(unlockedSkills: string[]): boolean {
  if (!unlockedSkills.includes("skip_path_anim")) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_PATH_ANIM_KEY) !== "0";
}

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState("puzzles");
  const [campaign, setCampaign] = useState<"main" | "fantasy">("main");
  const [fantasyTrackUnlocked, setFantasyTrackUnlocked] = useState(false);
  const [mainCampaignComplete, setMainCampaignComplete] = useState(false);
  const progressInitialized = useRef(false);

  /** Select a puzzle AND always switch to the puzzle tab so it's immediately visible. */
  const handleSelectPuzzle = useCallback((id: string) => {
    setSelectedPuzzleId(id);
    setActiveTab("puzzles");
  }, []);

  const sortedPuzzles = useMemo(() => sortPuzzles(puzzles), [puzzles]);
  const mainTrackPuzzles = useMemo(
    () => sortedPuzzles.filter((p) => (p.track ?? "main") === "main"),
    [sortedPuzzles]
  );
  const fantasyTrackPuzzles = useMemo(
    () => sortedPuzzles.filter((p) => p.track === "fantasy"),
    [sortedPuzzles]
  );
  const activePuzzles = campaign === "fantasy" ? fantasyTrackPuzzles : mainTrackPuzzles;
  const hasFantasyCampaign = fantasyTrackPuzzles.length > 0;
  /** Standard puzzles only — used for main-path progression tracking. */
  const sortedStandard = useMemo(
    () => mainTrackPuzzles.filter((p) => p.kind === "standard"),
    [mainTrackPuzzles]
  );
  /** Frontier node for the Fantasy campaign token (first open puzzle). */
  const fantasyFrontierIndex = useMemo(() => {
    const idx = fantasyTrackPuzzles.findIndex((p) => !p.completed && !p.locked);
    return idx >= 0 ? idx : Math.max(0, fantasyTrackPuzzles.length - 1);
  }, [fantasyTrackPuzzles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initAscension();
      const [state, puzzleData] = await Promise.all([
        fetchAscensionState(),
        fetchAscensionPuzzles(),
      ]);
      setCard(state.card);
      setUnlockedSkills(state.unlockedSkills);
      setPuzzles(puzzleData.puzzles);
      setFantasyTrackUnlocked(puzzleData.fantasyTrackUnlocked);
      setMainCampaignComplete(puzzleData.mainCampaignComplete);
      if (!selectedPuzzleId && puzzleData.puzzles[0]) {
        const sorted = sortPuzzles(puzzleData.puzzles);
        const standard = sorted.filter((p) => p.kind === "standard");
        const openIdx = firstOpenStandardPuzzleIndex(sorted);
        // Prefer first open standard puzzle; fall back to first puzzle overall
        setSelectedPuzzleId(standard[openIdx]?.id ?? sorted[0]?.id ?? null);
      }
      if (!progressInitialized.current) {
        const sorted = sortPuzzles(puzzleData.puzzles);
        setProgressNodeIndex(firstOpenStandardPuzzleIndex(sorted));
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

  const selectedPuzzle =
    activePuzzles.find((p) => p.id === selectedPuzzleId) ?? activePuzzles[0];

  const handleComplete = useCallback(
    async (moves: string[], timeMs: number) => {
      if (!selectedPuzzle || !card || pendingReward) return false;
      try {
        const previousTier = card.tier as ChampionTier;
        const isFantasy = selectedPuzzle.kind === "fantasy";
        const result = await completeAscensionPuzzle(selectedPuzzle.id, moves, timeMs);
        if (result.solved && result.card && result.rewards) {
          setCard(result.card);
          track("ascension_puzzle_complete", {
            puzzleId: selectedPuzzle.id,
            kind: selectedPuzzle.kind,
            eloAfter: result.card.elo,
          });

          setPuzzles((prev) => {
            const updated = prev.map((p) =>
              p.id === selectedPuzzle.id ? { ...p, completed: true } : p
            );
            const newElo = result.rewards!.newElo;
            const locked = applyPuzzleLocks(updated, newElo);
            if (newElo >= 3000 || isMainCampaignComplete(locked)) {
              setFantasyTrackUnlocked(true);
            }
            if (isMainCampaignComplete(locked)) {
              setMainCampaignComplete(true);
            }
            return locked;
          });

          setPendingReward({
            xpGain: result.rewards.xpGain,
            eloGain: result.rewards.eloGain,
            newElo: result.rewards.newElo,
            newXp: result.rewards.newXp,
            newTier: result.rewards.newTier as ChampionTier,
            previousTier,
            achievement: result.achievement,
          });

          if (selectedPuzzle.track === "fantasy") {
            // Fantasy campaign: advance to the next sequential puzzle in the track.
            const fantasyIdx = fantasyTrackPuzzles.findIndex(
              (p) => p.id === selectedPuzzle.id
            );
            const nextFantasy = fantasyTrackPuzzles[fantasyIdx + 1] ?? null;
            setPendingAdvance({ toIndex: progressNodeIndex, nextPuzzleId: nextFantasy?.id ?? null });
          } else if (isFantasy) {
            // Bonus quest: don't advance the main path token, just reset the puzzle.
            setPendingAdvance({ toIndex: progressNodeIndex, nextPuzzleId: null });
          } else {
            // Standard puzzle: advance the path token if this was the frontier.
            const standardCompletedIdx = sortedStandard.findIndex(
              (p) => p.id === selectedPuzzle.id
            );
            const nextStandard = sortedStandard[standardCompletedIdx + 1] ?? null;
            const shouldAdvance =
              standardCompletedIdx === progressNodeIndex &&
              standardCompletedIdx < sortedStandard.length - 1;
            setPendingAdvance({
              toIndex: shouldAdvance ? standardCompletedIdx + 1 : progressNodeIndex,
              nextPuzzleId: shouldAdvance ? nextStandard?.id ?? null : null,
            });
          }

          if (unlockedSkills.includes("skip_path_anim") && typeof window !== "undefined") {
            localStorage.setItem(SKIP_PATH_ANIM_KEY, "1");
          }
          return true;
        }
        return false;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.ascension.completeError);
        return false;
      }
    },
    [
      selectedPuzzle,
      card,
      pendingReward,
      sortedStandard,
      fantasyTrackPuzzles,
      progressNodeIndex,
      unlockedSkills,
      t.ascension.completeError,
    ]
  );

  const skipPathAnim = shouldSkipPathAnim(unlockedSkills);

  const handleSelectCampaign = useCallback(
    (next: "main" | "fantasy") => {
      setCampaign(next);
      const list = next === "fantasy" ? fantasyTrackPuzzles : mainTrackPuzzles;
      const open = list.find((p) => !p.completed && !p.locked) ?? list[0];
      setSelectedPuzzleId(open?.id ?? null);
      setActiveTab("puzzles");
    },
    [fantasyTrackPuzzles, mainTrackPuzzles]
  );

  const handleRewardContinue = () => {
    if (!pendingAdvance) {
      setPendingReward(null);
      return;
    }

    setPendingReward(null);
    const { toIndex, nextPuzzleId } = pendingAdvance;

    if (skipPathAnim || toIndex === progressNodeIndex) {
      if (toIndex !== progressNodeIndex) {
        setProgressNodeIndex(toIndex);
      }
      if (nextPuzzleId && nextPuzzleId !== selectedPuzzleId) {
        setSelectedPuzzleId(nextPuzzleId);
      } else {
        setPuzzleSessionKey((k) => k + 1);
      }
      setPendingAdvance(null);
      return;
    }

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
      <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-4">

          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-100">{t.pages.ascension.title}</h1>
              <p className="text-slate-500 text-xs">{t.pages.ascension.subtitle}</p>
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
          </header>

          {loading || !card || !cardModel ? (
            <AscensionLoadingScreen />
          ) : (
            /* ── 3-column layout on lg: path (wider) | puzzle | card ── */
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_220px] xl:grid-cols-[380px_1fr_240px] 2xl:grid-cols-[420px_1fr_260px] gap-4">

              {/* LEFT: Parcours d'ascension */}
              <div className="lg:row-span-2 space-y-3">
                {hasFantasyCampaign && (
                  <div className="inline-flex w-full rounded-lg border border-slate-800 overflow-hidden">
                    {(["main", "fantasy"] as const).map((c) => {
                      const locked = c === "fantasy" && !fantasyTrackUnlocked;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectCampaign(c)}
                          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                            campaign === c
                              ? c === "fantasy"
                                ? "bg-purple-800 text-purple-50"
                                : "bg-cyan-700 text-white"
                              : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {c === "main"
                            ? t.ascension.campaignMain
                            : `${t.ascension.campaignFantasy}${locked ? " 🔒" : ""}`}
                        </button>
                      );
                    })}
                  </div>
                )}

                {mainCampaignComplete &&
                  campaign === "main" &&
                  hasFantasyCampaign &&
                  fantasyTrackUnlocked && (
                    <button
                      type="button"
                      onClick={() => handleSelectCampaign("fantasy")}
                      className="w-full text-left rounded-lg border border-purple-500/40 bg-gradient-to-r from-purple-950/60 to-fuchsia-950/40 px-3 py-2.5 hover:border-purple-400/70 transition-colors"
                    >
                      <p className="text-xs font-semibold text-purple-200">
                        {t.ascension.fantasyCampaignBannerTitle}
                      </p>
                      <p className="text-[11px] text-purple-300/80 mt-0.5">
                        {t.ascension.fantasyCampaignBannerCta}
                      </p>
                    </button>
                  )}

                <AscensionProgressPath
                  puzzles={activePuzzles}
                  card={cardModel}
                  selectedPuzzleId={selectedPuzzle?.id ?? null}
                  onSelectPuzzle={handleSelectPuzzle}
                  unlockedSkills={unlockedSkills}
                  variant={campaign === "fantasy" ? "fantasy" : "main"}
                  progressNodeIndex={
                    campaign === "fantasy" ? fantasyFrontierIndex : progressNodeIndex
                  }
                  animateToIndex={campaign === "fantasy" ? null : animateToIndex}
                  onAnimationComplete={
                    campaign === "fantasy" ? undefined : handlePathAnimationComplete
                  }
                />
              </div>

              {/* CENTER: Puzzle / Skills (tabs) */}
              <div>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="puzzles" className="flex-1">{t.ascension.tabPuzzles}</TabsTrigger>
                    <TabsTrigger value="skills" className="flex-1">{t.ascension.tabSkills}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="puzzles" className="mt-3">
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
                  <TabsContent value="skills" className="mt-3">
                    <SkillTreePanel
                      unlockedSkills={unlockedSkills}
                      currentXp={card.xp}
                      onUnlock={handleUnlock}
                      unlocking={unlocking}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT: Champion card + compact settings */}
              <div className="space-y-3">
                <ChampionTradingCard model={cardModel} className="mx-auto" />

                {/* Compact settings — collapsible */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Pencil className="h-3 w-3" />
                      {t.ascension.displayName} / {t.ascension.playStyle} / {t.ascension.element}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {settingsOpen && (
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60">
                      {/* Name */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500 w-14 shrink-0">{t.ascension.displayName}</label>
                        {editingName ? (
                          <Input
                            className="h-7 text-xs"
                            value={card.display_name}
                            autoFocus
                            onChange={(e) => setCard({ ...card, display_name: e.target.value })}
                            onBlur={() => {
                              setEditingName(false);
                              void handleCardUpdate({ display_name: card.display_name });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setEditingName(false);
                                void handleCardUpdate({ display_name: card.display_name });
                              }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingName(true)}
                            className="flex-1 text-left text-xs text-slate-200 hover:text-cyan-300 truncate"
                          >
                            {card.display_name || "—"}
                          </button>
                        )}
                      </div>

                      {/* Play style */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500 w-14 shrink-0">{t.ascension.playStyle}</label>
                        <select
                          className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
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

                      {/* Element */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500 w-14 shrink-0">{t.ascension.element}</label>
                        <select
                          className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
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
                  )}
                </div>
              </div>
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
