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

export function useLearnCatalog(): {
  catalog: MergedLearnCatalog;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [rows, setRows] = useState<LearnEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("learn_entries")
      .select("opening_id, opening_json, lesson_json");
    if (error) {
      setRows([]);
    } else {
      setRows(parseRows(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catalog = useMemo(() => buildMergedCatalog(rows), [rows]);

  return { catalog, loading, refetch: load };
}
