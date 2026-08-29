import { describe, expect, it } from "vitest";
import {
  nextFrontierAfterSolve,
  nextItemAfterId,
} from "@/lib/ascension/progress-path";

describe("nextFrontierAfterSolve", () => {
  const ids = ["a", "b", "c", "d"];

  it("advances from the frontier to the next puzzle", () => {
    expect(nextFrontierAfterSolve(ids, "b", 1)).toEqual({
      nextIndex: 2,
      nextId: "c",
    });
  });

  it("does not move when replaying an earlier puzzle", () => {
    expect(nextFrontierAfterSolve(ids, "a", 2)).toEqual({
      nextIndex: 2,
      nextId: null,
    });
  });

  it("stays put on the last puzzle", () => {
    expect(nextFrontierAfterSolve(ids, "d", 3)).toEqual({
      nextIndex: 3,
      nextId: null,
    });
  });
});

describe("nextItemAfterId", () => {
  it("returns the following item", () => {
    expect(nextItemAfterId([{ id: "a" }, { id: "b" }], "a")).toEqual({ id: "b" });
  });

  it("returns null at the end of the list", () => {
    expect(nextItemAfterId([{ id: "a" }], "a")).toBeNull();
  });
});
