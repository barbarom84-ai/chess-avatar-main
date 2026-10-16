"use client";

import { useSyncExternalStore } from "react";
import { profileIdentityKey } from "@/lib/arena-profile-pool";
import {
  EMPTY_ARENA_RATINGS,
  getArenaRatings,
  subscribeArenaRatings,
  type ArenaRatingEntrant,
  type ArenaRatingsState,
} from "@/lib/arena-rating";
import type { ProfileOption } from "@/lib/arena-types";

const serverSnapshot = () => EMPTY_ARENA_RATINGS;

export function useArenaRatings(): ArenaRatingsState {
  return useSyncExternalStore(subscribeArenaRatings, getArenaRatings, serverSnapshot);
}

/**
 * Same avatar = same rating, whether it comes from saved, recent, cloud or champions lists.
 * Human players are keyed by their local id so they never merge with a same-named avatar.
 */
export function arenaEntrant(option: ProfileOption): ArenaRatingEntrant {
  return {
    key: option.human ? option.key : profileIdentityKey(option.config),
    name: option.config.name || option.label,
    seedElo: option.config.elo,
  };
}
