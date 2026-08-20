import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.arena,
};

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return children;
}
