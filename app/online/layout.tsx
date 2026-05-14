import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.online,
};

export default function OnlineLayout({ children }: { children: ReactNode }) {
  return children;
}
