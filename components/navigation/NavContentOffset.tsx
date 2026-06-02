"use client";

import { useSiteConfig } from "@/contexts/SiteConfigContext";
import type { NavMode } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const OFFSET_BY_MODE: Record<NavMode, string> = {
  classic: "",
  mega: "",
  radial: "pb-16 md:pb-0",
  dock: "pb-16 md:pl-14 md:pb-0",
};

export default function NavContentOffset({ children }: { children: React.ReactNode }) {
  const { config } = useSiteConfig();
  const offset = OFFSET_BY_MODE[config.navMode] ?? "";

  return <div className={cn(offset)}>{children}</div>;
}
