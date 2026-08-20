import { accountApiHeaders } from "@/lib/account-api-auth";
import type { PvpHeadToHeadRecord } from "@/lib/pvp-head-to-head";

export type PvpHeadToHeadResponse = {
  record: PvpHeadToHeadRecord;
  opponent: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastTimePreset: string | null;
};

export async function fetchPvpHeadToHead(
  opponentUserId: string
): Promise<PvpHeadToHeadResponse | null> {
  const res = await fetch(
    `/api/pvp/head-to-head?opponentId=${encodeURIComponent(opponentUserId)}`,
    {
      cache: "no-store",
      credentials: "include",
      headers: await accountApiHeaders(false),
    }
  );
  if (!res.ok) return null;
  try {
    return (await res.json()) as PvpHeadToHeadResponse;
  } catch {
    return null;
  }
}
