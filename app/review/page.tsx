"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UpgradeModal from "@/components/UpgradeModal";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import {
  REVIEW_PGN_SESSION_KEY,
  readReviewSessionContext,
  type ReviewSessionContext,
} from "@/lib/review-session";

const GameReviewer = dynamic(() => import("@/components/GameReviewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[60dvh] lg:h-[600px] bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-700">
      Loading…
    </div>
  ),
});

const FREE_MAX_PLIES = 60;

function ReviewContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isPremium, userId, email } = usePremium();
  const [pgn, setPgn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [reviewCtx, setReviewCtx] = useState<ReviewSessionContext | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("pgn");
    if (fromUrl) {
      try {
        setPgn(decodeURIComponent(fromUrl));
        setReviewCtx(null);
        return;
      } catch {
        setError(t.review.invalidPgn);
        return;
      }
    }
    if (typeof window !== "undefined") {
      setReviewCtx(readReviewSessionContext());
      const stored = sessionStorage.getItem(REVIEW_PGN_SESSION_KEY);
      if (stored) {
        setPgn(stored);
        return;
      }
    }
    setError(t.review.noPgn);
  }, [searchParams, t.review.invalidPgn, t.review.noPgn]);

  if (error) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md theme-bg-secondary border-cyan-500/20 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-4">
            <Alert
              variant="destructive"
              className="bg-red-900/20 border-red-700/50 text-red-200"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              variant="ghost"
              className="text-cyan-300 hover:text-cyan-100"
              onClick={() => router.push("/games")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.review.import.backToImport}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!pgn) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400/70">{t.review.engineLoading}</p>
        </div>
      </main>
    );
  }

  const maxPlies = isPremium ? Number.POSITIVE_INFINITY : FREE_MAX_PLIES;
  const showAllBestArrows = isPremium;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-[1500px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/games">
            <Button variant="ghost" className="text-cyan-300 hover:text-cyan-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToHome}
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-cyan-400">
            {t.review.pageTitle}
          </h1>
          <div className="w-32 hidden md:block"></div>
        </div>

        {!isPremium && (
          <Card className="bg-amber-900/20 border-amber-500/30">
            <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-amber-200">
                {t.review.freeLimits
                  .replace("{depth}", String(12))
                  .replace("{plies}", String(FREE_MAX_PLIES))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUpgrade(true)}
                className="border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
              >
                <Crown className="h-4 w-4 mr-2" />
                {t.review.upgradeForFull}
              </Button>
            </CardContent>
          </Card>
        )}

        <GameReviewer
          pgn={pgn}
          isPremium={isPremium}
          maxPlies={maxPlies}
          showAllBestArrows={showAllBestArrows}
          cacheUserId={isPremium ? userId : null}
          onRequestUpgrade={() => setShowUpgrade(true)}
          authUserId={userId}
          reviewCloudSavePlayerHint={reviewCtx?.playerName ?? null}
          cloudSaveContext={{
            emailLocalPart: email?.split("@")[0] ?? null,
          }}
        />
      </div>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        userId={userId}
        email={email}
        reason="coach"
      />
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen theme-gradient theme-text-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-cyan-400/70">Loading…</p>
          </div>
        </main>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
