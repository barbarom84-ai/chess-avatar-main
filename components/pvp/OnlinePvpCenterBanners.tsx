"use client";

import type { ReactNode } from "react";
import { Children } from "react";

type OnlinePvpCenterBannersProps = {
  children: ReactNode;
  /** Fond assombri pour les demandes adversaire (nulle / reprise). */
  dimBackdrop?: boolean;
};

/** Empile les bannières PvP au centre de l'écran. */
export default function OnlinePvpCenterBanners({
  children,
  dimBackdrop = false,
}: OnlinePvpCenterBannersProps) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
      aria-live="polite"
    >
      {dimBackdrop ? (
        <div
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm pointer-events-none"
          aria-hidden
        />
      ) : null}
      <div className="relative flex flex-col gap-3 w-full max-w-md pointer-events-auto">
        {items}
      </div>
    </div>
  );
}
