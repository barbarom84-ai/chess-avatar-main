import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import OnlinePvpPage from "@/components/OnlinePvpPage";

export default function OnlineDedicatedPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" aria-hidden />
        </main>
      }
    >
      <OnlinePvpPage />
    </Suspense>
  );
}
