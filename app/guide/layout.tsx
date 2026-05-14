import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.guide,
};

export default function GuideLayout({ children }: { children: ReactNode }) {
  return children;
}
