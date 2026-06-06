"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardPaste,
  FileUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/language-context";
import { parsePgnForReview } from "@/lib/game-review";
import { inferImportSavePlayerHint } from "@/lib/pgn-import";
import { SAMPLE_GAMES } from "@/lib/sample-games";
import {
  REVIEW_PGN_SESSION_KEY,
  clearReviewSessionContext,
} from "@/lib/review-session";
/** 200 KB cap on user-supplied PGN to prevent abuse. */
const MAX_PGN_BYTES = 200 * 1024;

export interface PgnImportCardProps {
  /**
   * When provided, validated PGN is forwarded to this callback instead of
   * being persisted to sessionStorage and navigated to `/review`. Lets a
   * parent host the GameReviewer inline (e.g. the unified `/games` hub).
   */
  onPgnReady?: (pgn: string, playerHint?: string | null) => void;
  /** Used to prefill the save-player hint from localStorage when headers match. */
  authUserId?: string | null;
}

export default function PgnImportCard({
  onPgnReady,
  authUserId = null,
}: PgnImportCardProps = {}) {
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Validate the PGN. If `onPgnReady` is supplied the parent handles the
   * follow-up (typically rendering GameReviewer inline). Otherwise we keep
   * the legacy behaviour: persist to sessionStorage and navigate to `/review`.
   */
  const goReview = useCallback(
    (pgn: string): boolean => {
      setError(null);
      const trimmed = pgn.trim();
      if (!trimmed) {
        setError(t.review.import.errorEmpty);
        return false;
      }
      if (trimmed.length > MAX_PGN_BYTES) {
        setError(t.review.import.errorTooLarge);
        return false;
      }
      const parsed = parsePgnForReview(trimmed);
      if (!parsed || parsed.san.length === 0) {
        setError(t.review.import.errorInvalid);
        return false;
      }
      clearReviewSessionContext();
      const playerHint = inferImportSavePlayerHint(trimmed, authUserId);
      if (onPgnReady) {
        onPgnReady(trimmed, playerHint);
        return true;
      }
      try {
        sessionStorage.setItem(REVIEW_PGN_SESSION_KEY, trimmed);
      } catch {
        setError(t.review.import.errorStorage);
        return false;
      }
      router.push("/review");
      return true;
    },
    [authUserId, onPgnReady, router, t.review.import]
  );

  const handlePasteSubmit = useCallback(() => {
    goReview(pasted);
  }, [goReview, pasted]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > MAX_PGN_BYTES) {
        setError(t.review.import.errorTooLarge);
        return;
      }
      try {
        const text = await file.text();
        goReview(text);
      } catch {
        setError(t.review.import.errorRead);
      }
    },
    [goReview, t.review.import]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <Card className="bg-slate-900/60 border-cyan-500/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-cyan-300 flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          {t.review.import.title}
        </CardTitle>
        <p className="text-sm text-slate-400">{t.review.import.subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="paste">
          <TabsList className="bg-slate-950/60 w-full">
            <TabsTrigger value="paste" className="flex-1">
              <ClipboardPaste className="h-4 w-4 mr-2" />
              {t.review.import.tabPaste}
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1">
              <FileUp className="h-4 w-4 mr-2" />
              {t.review.import.tabFile}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4 space-y-3">
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={t.review.import.pastePlaceholder}
              className="w-full h-48 bg-slate-950 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-y"
            />
            <Button
              onClick={handlePasteSubmit}
              disabled={!pasted.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t.review.import.analyzeButton}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="mt-4 space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-lg p-8 text-center cursor-pointer transition-colors bg-slate-950/40"
            >
              <FileUp className="h-10 w-10 mx-auto mb-3 text-slate-500" />
              <p className="text-sm text-slate-300 mb-1">
                {t.review.import.dropHint}
              </p>
              <p className="text-xs text-slate-500">
                {t.review.import.dropAccepted}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pgn,text/plain"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert
            variant="destructive"
            className="bg-red-900/20 border-red-700/50 text-red-200"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sample games */}
        <div className="pt-2 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            {t.review.import.samplesTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => goReview(game.pgn)}
                className="text-left p-3 rounded-lg border border-slate-700 bg-slate-950/40 hover:bg-slate-800/60 hover:border-cyan-500/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-100">
                    {game.white}
                    <span className="text-slate-500 mx-1">vs</span>
                    {game.black}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {game.year}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">{game.event}</p>
                <p className="text-xs text-slate-500 group-hover:text-cyan-300 transition-colors">
                  {game.blurb[lang]}
                </p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
