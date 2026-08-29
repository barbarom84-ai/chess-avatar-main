import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { profileIdentityKey } from "@/lib/arena-profile-pool";
import { CHESS_AVATAR_PRO_CONFIG } from "@/lib/chess-avatar-pro-coach";

export type ReviewCoachAvatar = {
  id: string;
  config: EngineConfig;
  stats: PersonaStats;
};

function coachDisplayName(avatar: ReviewCoachAvatar): string {
  return (avatar.config.name || avatar.stats.username || "").trim();
}

/** Unique coaches for the review picker: skip house coach, opponent, and same-name copies. */
export function dedupeReviewCoachAvatars(
  avatars: ReviewCoachAvatar[],
  opponentConfig?: EngineConfig | null
): ReviewCoachAvatar[] {
  const seenIdentity = new Set<string>();
  const seenName = new Set<string>();
  const proName = CHESS_AVATAR_PRO_CONFIG.name.trim().toLowerCase();
  const oppName = (opponentConfig?.name || "").trim().toLowerCase();
  const oppIdentity = opponentConfig ? profileIdentityKey(opponentConfig) : "";

  const out: ReviewCoachAvatar[] = [];
  for (const avatar of avatars) {
    const name = coachDisplayName(avatar);
    const nameKey = name.toLowerCase();
    if (!nameKey || nameKey === proName) continue;
    if (oppName && nameKey === oppName) continue;
    const identity = profileIdentityKey({ ...avatar.config, name });
    if (oppIdentity && identity === oppIdentity) continue;
    if (seenIdentity.has(identity) || seenName.has(nameKey)) continue;
    seenIdentity.add(identity);
    seenName.add(nameKey);
    out.push(avatar);
  }
  return out;
}
