import type { Metadata } from "next";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.learn,
  description:
    "Learn chess openings with recommended levels, plans, traps, and annotated historic games. FR/EN.",
  openGraph: {
    title: `${pageMetaTitles.learn} | Chess Avatar`,
    description: "Plans, levels, traps, and history — beyond memorization.",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
