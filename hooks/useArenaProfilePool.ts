"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadArenaProfilePool } from "@/lib/arena-profile-pool";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";

/** Arena profile pool, loaded once for both the Spectator and Playoff tabs. */
export function useArenaProfilePool() {
  const { t, lang } = useLanguage();
  const [options, setOptions] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  const labels = t.arenaPage;
  const { savedProfiles, recentProfiles, cloudLibrary, featuredChampions } = labels;

  const load = useCallback(
    async (force: boolean) => {
      const id = ++requestRef.current;
      setLoading(true);
      try {
        const rows = await loadArenaProfilePool(
          { savedProfiles, recentProfiles, cloudLibrary, featuredChampions },
          lang,
          { force }
        );
        if (id === requestRef.current) setOptions(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (id === requestRef.current) setLoading(false);
      }
    },
    [savedProfiles, recentProfiles, cloudLibrary, featuredChampions, lang]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  /** Manual refresh bypasses the short-lived source cache. */
  const reload = useCallback(() => load(true), [load]);

  return { options, loading, reload };
}

export type ArenaProfilePool = ReturnType<typeof useArenaProfilePool>;
