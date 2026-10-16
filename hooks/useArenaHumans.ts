"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getArenaHumans,
  getServerArenaHumans,
  humanOption,
  subscribeArenaHumans,
  type ArenaHumanProfile,
} from "@/lib/arena-humans";
import type { ProfileOption } from "@/lib/arena-types";

export function useArenaHumans(): { humans: ArenaHumanProfile[]; options: ProfileOption[] } {
  const humans = useSyncExternalStore(subscribeArenaHumans, getArenaHumans, getServerArenaHumans);
  const options = useMemo(() => humans.map(humanOption), [humans]);
  return { humans, options };
}
