import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Opening lessons | Chess Avatar",
  description:
    "Learn chess openings with recommended levels, plans, traps, and annotated historic games. FR/EN.",
  openGraph: {
    title: "Opening lessons | Chess Avatar",
    description: "Plans, levels, traps, and history — beyond memorization.",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
