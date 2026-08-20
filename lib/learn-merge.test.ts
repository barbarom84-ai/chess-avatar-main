import { describe, expect, it } from "vitest";
import { buildMergedCatalog, syntheticLessonFromOpening } from "@/lib/learn-merge";
import {
  clearAggregatedOpeningsCache,
  ensureOpeningsPartitionsLoaded,
  setPartitionOpeningsForTests,
} from "@/lib/openings-registry";
import type { Opening } from "@/lib/openings-library";

describe("syntheticLessonFromOpening", () => {
  it("does not throw when description is missing", () => {
    const opening = {
      id: "no-desc",
      name: "Test",
      eco: "A00",
      moves: "1. e4",
      uciMoves: ["e2e4"],
      character: "balanced",
      difficulty: 3,
      popularity: 3,
      color: "both",
      tags: ["test"],
    } as Opening;
    const lesson = syntheticLessonFromOpening(opening);
    expect(lesson.openingId).toBe("no-desc");
    expect(lesson.hook.fr.length).toBeGreaterThan(0);
  });
});

describe("buildMergedCatalog", () => {
  it("builds after incomplete partition openings are injected", () => {
    clearAggregatedOpeningsCache();
    setPartitionOpeningsForTests([
      {
        id: "partition-no-desc",
        name: "Partition",
        nameEn: "Partition",
        eco: "B00",
        moves: "1. e4",
        uciMoves: ["e2e4"],
        character: "balanced",
        difficulty: 3,
        popularity: 3,
        color: "both",
        tags: ["partition"],
      } as Opening,
    ]);
    const catalog = buildMergedCatalog([]);
    expect(catalog.openingById.has("partition-no-desc")).toBe(true);
    expect(catalog.lessons.some((l) => l.openingId === "partition-no-desc")).toBe(true);
    clearAggregatedOpeningsCache();
  });

  it("builds the real Lichess partition catalog", async () => {
    clearAggregatedOpeningsCache();
    await ensureOpeningsPartitionsLoaded();
    const catalog = buildMergedCatalog([]);
    expect(catalog.lessons.length).toBeGreaterThan(20);
    expect(catalog.openingById.size).toBeGreaterThan(20);
    clearAggregatedOpeningsCache();
  });
});
