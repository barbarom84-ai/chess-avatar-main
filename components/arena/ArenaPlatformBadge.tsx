"use client";

import { arenaPlatformOf } from "@/lib/arena-humans";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";

export default function ArenaPlatformBadge({ option }: { option: ProfileOption }) {
  const ap = useLanguage().t.arenaPage;
  const platform = arenaPlatformOf(option);
  const label =
    platform === "human"
      ? ap.platformHumanShort
      : platform === "lichess"
        ? ap.platformLichessShort
        : ap.platformChesscomShort;
  return (
    <span className="arena-platform" data-platform={platform}>
      {label}
    </span>
  );
}
