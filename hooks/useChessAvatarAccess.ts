"use client";

import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { isChessAvatarAllowedForUser } from "@/lib/site-config";
import { useSuperUser } from "@/hooks/useSuperUser";

/** True when the current user may use ChessAvatar (WASM play + native UCI pack). */
export function useChessAvatarAccess(): boolean {
  const { config } = useSiteConfig();
  const { isSuperUser } = useSuperUser();
  return isChessAvatarAllowedForUser(isSuperUser, config);
}
