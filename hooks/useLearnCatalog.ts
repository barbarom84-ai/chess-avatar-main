"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  buildMergedCatalog,
  type LearnEntryRow,
  type MergedLearnCatalog,
  validateOpeningJson,
  validateOpeningLessonJson,
} from "@/lib/learn-merge";
import { ensureOpeningsPartitionsLoaded } from "@/lib/openings-registry";
import {
  classifyFetchFailure,
  type FetchErrorKind,
  withTimeout,
} from "@/lib/fetch-errors";

function parseRows(raw: unknown): LearnEntryRow[] {
  if (!Array.isArray(raw)) return [];
  const out: LearnEntryRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const row = r as Record<string, unknown>;
    const opening_id = row.opening_id;
    if (typeof opening_id !== "string") continue;
    const op = row.opening_json;
    const le = row.lesson_json;
    if (!validateOpeningJson(op) || !validateOpeningLessonJson(le)) continue;
    if (op.id !== opening_id || le.openingId !== opening_id) continue;
    out.push({ opening_id, opening_json: op, lesson_json: le });
  }
  return out;
}

export type LearnCatalogError = {
  kind: FetchErrorKind;
};

export function useLearnCatalog(): {
  catalog: MergedLearnCatalog;
  loading: boolean;
  error: LearnCatalogError | null;
  /** True when cloud rows failed but built-in catalog may still be usable. */
  cloudDegraded: boolean;
  refetch: () => Promise<void>;
} {
  const [rows, setRows] = useState<LearnEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LearnCatalogError | null>(null);
  const [partitionsGeneration, setPartitionsGeneration] = useState(0);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await withTimeout(
        Promise.resolve(
          supabase.from("learn_entries").select("opening_id, opening_json, lesson_json")
        ),
        15_000,
        "Learn catalog request timed out"
      );
      if (result.error) {
        setRows([]);
        setError({ kind: classifyFetchFailure(result.error).kind });
      } else {
        setRows(parseRows(result.data));
        setError(null);
      }
    } catch (err) {
      setRows([]);
      setError({ kind: classifyFetchFailure(err).kind });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void ensureOpeningsPartitionsLoaded().finally(() => {
      setPartitionsGeneration((n) => n + 1);
    });
  }, []);

  const catalog = useMemo(
    () => buildMergedCatalog(rows),
    [rows, partitionsGeneration]
  );

  return {
    catalog,
    loading,
    error,
    cloudDegraded: error !== null,
    refetch: load,
  };
}
