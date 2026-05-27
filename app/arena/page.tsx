"use client";

import dynamic from "next/dynamic";

const ArenaPageShell = dynamic(() => import("@/components/ArenaPageShell"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
    </div>
  ),
});

export default function ArenaPage() {
  return (
    <main className="min-h-screen theme-gradient theme-text-primary py-4 md:py-8">
      <ArenaPageShell />
    </main>
  );
}
