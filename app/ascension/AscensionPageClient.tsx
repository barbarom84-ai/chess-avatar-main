"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Crown, Pencil, Settings2 } from "lucide-react";
import AscensionLoadingScreen from "@/components/ascension/AscensionLoadingScreen";
import UpgradeModal from "@/components/UpgradeModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { firstOpenStandardPuzzleIndex, nextFrontierAfterSolve, nextItemAfterId } from "@/lib/ascension/progress-path";
import {
  applyPuzzleLocks,
  isMainCampaignComplete,
} from "@/lib/ascension/campaign-puzzle-utils";
import {
  isTrackUnlocked,
  trackLabel,
  type DbCampaignTrack,
} from "@/lib/ascension/campaign-tracks";
import {
  ASCENSION_FREE_PUZZLES_PER_TRACK,
  ASCENSION_PREMIUM_PUZZLES_PER_TRACK,
} from "@/lib/ascension/constants";
import type { ChampionTier, DbPlayerChampionCard } from "@/lib/ascension/types";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";
import { usePremium } from "@/hooks/usePremium";
import { track } from "@/lib/track";

const SKIP_PATH_ANIM_KEY = "ascension_skip_path_anim";

function shouldSkipPathAnim(unlockedSkills: string[]): boolean {
  if (!unlockedSkills.includes("skip_path_anim")) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_PATH_ANIM_KEY) !== "0";
}

type PendingAdvance = {
  toIndex: number;
};

function sortPuzzles(puzzles: AscensionPuzzleListItem[]) {
  return [...puzzles].sort((a, b) => a.sort_order - b.sort_order);
}

export default function AscensionPageClient() {
  const { t, lang } = useLanguage();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const { email, userId } = usePremium();
  const [card, setCard] = useState<DbPlayerChampionCard | null>(null);
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [puzzles, setPuzzles] = useState<AscensionPuzzleListItem[]>([]);
  const [tracks, setTracks] = useState<DbCampaignTrack[]>([]);
  const [trackUnlock, setTrackUnlock] = useState<Record<string, boolean>>({});
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
  const [campaign, setCampaign] = useState<string>("main");
  const [mainCampaignComplete, setMainCampaignComplete] = useState(false);
  const progressInitialized = useRef(false);

  /** Select a puzzle AND always switch to the puzzle tab so it's immediately visible. */
  const handleSelectPuzzle = useCallback((id: string) => {
    setSelectedPuzzleId(id);
    setActiveTab("puzzles");
  }, []);

  const sortedPuzzles = useMemo(() => sortPuzzles(puzzles), [puzzles]);
  const activeTrack = useMemo(
    () => tracks.find((tr) => tr.slug === campaign) ?? tracks[0],
    [tracks, campaign]
  );
  const mainTrackPuzzles = useMemo(
    () => sortedPuzzles.filter((p) => (p.track ?? "main") === "main"),
    [sortedPuzzles]
  );
  const activePuzzles = useMemo(
    () => sortedPuzzles.filter((p) => (p.track ?? "main") === campaign),
    [sortedPuzzles, campaign]
  );
  const hasMultipleTracks = tracks.length > 1;
  const fantasyTrackUnlocked = trackUnlock.fantasy ?? false;
  const isMainLayout = activeTrack?.layout === "main" && campaign === "main";
  /** Standard puzzles only — used for main-path progression tracking. */
  const sortedStandard = useMemo(
    () => mainTrackPuzzles.filter((p) => p.kind === "standard"),
    [mainTrackPuzzles]
  );
  /** Frontier node for sequential campaign tracks. */
  const trackFrontierIndex = useMemo(() => {
    const idx = activePuzzles.findIndex((p) => !p.completed && !p.locked);
    return idx >= 0 ? idx : Math.max(0, activePuzzles.length - 1);
  }, [activePuzzles]);

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
      setTracks(puzzleData.tracks ?? []);
      setTrackUnlock(puzzleData.trackUnlock);
      setIsPremium(puzzleData.isPremium);
      setMainCampaignComplete(puzzleData.mainCampaignComplete);
      setSelectedPuzzleId((current) => {
        if (current) return current;
        const sorted = sortPuzzles(puzzleData.puzzles);
        const standard = sorted.filter((p) => p.kind === "standard");
        const openIdx = firstOpenStandardPuzzleIndex(sorted);
        return standard[openIdx]?.id ?? sorted[0]?.id ?? null;
      });
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
  }, [t.ascension.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tracks.length > 0 && !tracks.some((tr) => tr.slug === campaign)) {
      setCampaign(tracks[0]!.slug);
    }
  }, [tracks, campaign]);

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
            const locked = applyPuzzleLocks(updated, newElo, tracks, isPremium);
            setTrackUnlock((prevUnlock) => {
              const next = { ...prevUnlock };
              for (const track of tracks) {
                next[track.slug] = isTrackUnlocked(track, newElo, locked);
              }
              return next;
            });
            if (isMainCampaignComplete(locked)) {
              setMainCampaignComplete(true);
            }
            return locked;
          });

          const isSpecialReward =
            (result.rewards.newTier as ChampionTier) !== previousTier ||
            Boolean(result.achievement);

          setPendingReward(
            isSpecialReward
              ? {
                  xpGain: result.rewards.xpGain,
                  eloGain: result.rewards.eloGain,
                  newElo: result.rewards.newElo,
                  newXp: result.rewards.newXp,
                  newTier: result.rewards.newTier as ChampionTier,
                  previousTier,
                  achievement: result.achievement,
                }
              : null
          );

          if (!isSpecialReward) {
            toast.success(
              t.ascension.rewardToast
                .replace("{xp}", String(result.rewards.xpGain))
                .replace("{elo}", String(result.rewards.eloGain))
            );
          }

          const trackPuzzles = sortedPuzzles.filter((p) => p.track === selectedPuzzle.track);
          const trackDef = tracks.find((tr) => tr.slug === selectedPuzzle.track);
          const skipAnim = shouldSkipPathAnim(unlockedSkills);

          if (trackDef?.layout === "sequential" && selectedPuzzle.track !== "main") {
            const nextInTrack = nextItemAfterId(trackPuzzles, selectedPuzzle.id);
            if (nextInTrack) {
              setSelectedPuzzleId(nextInTrack.id);
            } else {
              setPuzzleSessionKey((k) => k + 1);
            }
          } else if (isFantasy) {
            setPuzzleSessionKey((k) => k + 1);
          } else {
            const { nextIndex, nextId } = nextFrontierAfterSolve(
              sortedStandard.map((p) => p.id),
              selectedPuzzle.id,
              progressNodeIndex
            );
            if (nextId) {
              setSelectedPuzzleId(nextId);
            } else {
              setPuzzleSessionKey((k) => k + 1);
            }
            if (nextIndex !== progressNodeIndex) {
              if (skipAnim) {
                setProgressNodeIndex(nextIndex);
              } else {
                setPendingAdvance({ toIndex: nextIndex });
                setAnimateToIndex(nextIndex);
              }
            }
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
      sortedPuzzles,
      tracks,
      isPremium,
      progressNodeIndex,
      unlockedSkills,
      t.ascension.completeError,
      t.ascension.rewardToast,
    ]
  );

  const handleSelectCampaign = useCallback(
    (slug: string) => {
      setCampaign(slug);
      const list = sortedPuzzles.filter((p) => (p.track ?? "main") === slug);
      const open = list.find((p) => !p.completed && !p.locked) ?? list[0];
      setSelectedPuzzleId(open?.id ?? null);
      setActiveTab("puzzles");
    },
    [sortedPuzzles]
  );

  const handleRewardContinue = useCallback(() => {
    setPendingReward(null);
  }, []);

  const handlePathAnimationComplete = useCallback(() => {
    setPendingAdvance((advance) => {
      const to = advance?.toIndex;
      if (to != null) {
        queueMicrotask(() => setProgressNodeIndex(to));
      }
      return null;
    });
    setAnimateToIndex(null);
  }, []);

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
            <>
            {!isPremium && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-600/30 bg-amber-950/30 px-3 py-2">
                <p className="text-xs text-amber-200/90">
                  {t.ascension.freePlanBanner
                    .replace("{free}", String(ASCENSION_FREE_PUZZLES_PER_TRACK))
                    .replace("{premium}", String(ASCENSION_PREMIUM_PUZZLES_PER_TRACK))}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-600/40 text-amber-200 hover:bg-amber-900/40"
                  onClick={() => setShowUpgrade(true)}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  {t.ascension.upgradeCta}
                </Button>
              </div>
            )}
            {/* ── 3-column layout on lg: path (wider) | puzzle | card ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_220px] xl:grid-cols-[380px_1fr_240px] 2xl:grid-cols-[420px_1fr_260px] gap-4">

              {/* LEFT: Parcours d'ascension */}
              <div className="lg:row-span-2 space-y-3">
                {hasMultipleTracks && (
                  <div className="inline-flex w-full rounded-lg border border-slate-800 overflow-hidden flex-wrap">
                    {tracks.map((track) => {
                      const locked = !trackUnlock[track.slug];
                      const isFantasyTrack = track.slug === "fantasy";
                      return (
                        <button
                          key={track.slug}
                          type="button"
                          onClick={() => handleSelectCampaign(track.slug)}
                          className={`flex-1 min-w-[80px] px-3 py-2 text-xs font-medium transition-colors ${
                            campaign === track.slug
                              ? isFantasyTrack
                                ? "bg-purple-800 text-purple-50"
                                : "bg-cyan-700 text-white"
                              : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {trackLabel(track, lang)}
                          {locked ? " 🔒" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}

                {mainCampaignComplete &&
                  campaign === "main" &&
                  tracks.some((tr) => tr.slug === "fantasy") &&
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
                  key={campaign}
                  puzzles={activePuzzles}
                  card={cardModel}
                  selectedPuzzleId={selectedPuzzle?.id ?? null}
                  onSelectPuzzle={handleSelectPuzzle}
                  unlockedSkills={unlockedSkills}
                  variant={isMainLayout ? "main" : "fantasy"}
                  progressNodeIndex={isMainLayout ? progressNodeIndex : trackFrontierIndex}
                  animateToIndex={isMainLayout ? animateToIndex : null}
                  onAnimationComplete={isMainLayout ? handlePathAnimationComplete : undefined}
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
                    {selectedPuzzle ? (
                      <AscensionPuzzlePlayer
                        key={`${selectedPuzzle.id}-${puzzleSessionKey}`}
                        puzzle={selectedPuzzle}
                        unlockedSkills={unlockedSkills}
                        onComplete={handleComplete}
                        frozen={!!pendingReward}
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-8 text-center">
                        <p className="text-sm text-slate-400">{t.ascension.trackEmpty}</p>
                      </div>
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
            </>
          )}
        </div>
      </main>

      <AscensionRewardModal
        open={!!pendingReward}
        reward={pendingReward}
        onContinue={handleRewardContinue}
      />
      {userId && (
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          userId={userId}
          email={email}
          reason="ascension"
        />
      )}
    </AscensionGate>
  );
}
