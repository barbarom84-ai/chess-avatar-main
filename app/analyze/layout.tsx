import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.analyze,
};

export default function AnalyzeLayout({ children }: { children: ReactNode }) {
  return children;
}
