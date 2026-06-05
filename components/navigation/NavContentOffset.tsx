"use client";

import type { ReactNode } from "react";

/** Padding for fixed dock (left desktop, bottom mobile). */
export default function NavContentOffset({ children }: { children: ReactNode }) {
  return <div className="pb-16 md:pl-14 md:pb-0">{children}</div>;
}
