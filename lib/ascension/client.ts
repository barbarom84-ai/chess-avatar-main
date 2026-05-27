import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import type { DbCampaignPuzzle, DbPlayerChampionCard } from "@/lib/ascension/types";

export interface AscensionCardResponse {
  card: DbPlayerChampionCard;
  unlockedSkills: string[];
  completedPuzzleIds: string[];
}

export interface AscensionPuzzleListItem extends DbCampaignPuzzle {
  completed: boolean;
  attempts: number;
  /** True when the puzzle cannot be played yet (sequential lock for standard puzzles). */
  locked: boolean;
}

export async function initAscension(): Promise<DbPlayerChampionCard> {
  const res = await fetch("/api/ascension/init", {
    method: "POST",
    headers: await accountApiHeaders(),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Init failed"));
  const data = (await res.json()) as { card: DbPlayerChampionCard };
  return data.card;
}

export async function fetchAscensionState(): Promise<AscensionCardResponse> {
  const res = await fetch("/api/ascension/card", {
    headers: await accountApiHeaders(false),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Load failed"));
  return (await res.json()) as AscensionCardResponse;
}

export async function updateChampionCard(
  patch: Partial<Pick<DbPlayerChampionCard, "display_name" | "avatar_url" | "class_key" | "element" | "customization">>
): Promise<DbPlayerChampionCard> {
  const res = await fetch("/api/ascension/card", {
    method: "PATCH",
    headers: await accountApiHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Update failed"));
  const data = (await res.json()) as { card: DbPlayerChampionCard };
  return data.card;
}

export async function fetchAscensionPuzzles(): Promise<{
  puzzles: AscensionPuzzleListItem[];
  playerElo: number;
}> {
  const res = await fetch("/api/ascension/puzzles", {
    headers: await accountApiHeaders(false),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Puzzles failed"));
  return (await res.json()) as { puzzles: AscensionPuzzleListItem[]; playerElo: number };
}

export async function completeAscensionPuzzle(
  puzzleId: string,
  moves: string[],
  timeMs?: number
): Promise<{
  solved: boolean;
  rewards?: { xpGain: number; eloGain: number; newElo: number; newXp: number; newTier: string };
  card?: DbPlayerChampionCard;
}> {
  const res = await fetch("/api/ascension/puzzles/complete", {
    method: "POST",
    headers: await accountApiHeaders(),
    body: JSON.stringify({ puzzleId, moves, timeMs }),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Complete failed"));
  return (await res.json()) as {
    solved: boolean;
    rewards?: { xpGain: number; eloGain: number; newElo: number; newXp: number; newTier: string };
    card?: DbPlayerChampionCard;
  };
}

export async function unlockAscensionSkill(skillId: string): Promise<{
  card: DbPlayerChampionCard;
  unlockedSkillId: string;
}> {
  const res = await fetch("/api/ascension/skills/unlock", {
    method: "POST",
    headers: await accountApiHeaders(),
    body: JSON.stringify({ skillId }),
  });
  if (!res.ok) throw new Error(await readAccountApiError(res, "Unlock failed"));
  return (await res.json()) as { card: DbPlayerChampionCard; unlockedSkillId: string };
}
