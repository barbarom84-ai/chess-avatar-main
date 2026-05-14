import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetaTitles } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: pageMetaTitles.contact,
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
