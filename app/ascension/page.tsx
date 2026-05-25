import { Suspense } from "react";
import AscensionPageClient from "./AscensionPageClient";

export default function AscensionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        </div>
      }
    >
      <AscensionPageClient />
    </Suspense>
  );
}
