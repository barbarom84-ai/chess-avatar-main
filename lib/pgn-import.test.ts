import { describe, expect, it } from "vitest";
import {
  parsePgnTagInBlock,
  splitPgnDatabase,
  listPlayerNamesFromPgn,
} from "./pgn-import";

const SAMPLE = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Test2"]
[White "Carol"]
[Black "Dave"]
[Result "*"]

1. d4 d5 *`;

describe("pgn-import", () => {
  it("splits multiple games", () => {
    const parts = splitPgnDatabase(SAMPLE);
    expect(parts.length).toBe(2);
  });

  it("parses PGN tags", () => {
    const block = splitPgnDatabase(SAMPLE)[0];
    expect(parsePgnTagInBlock(block, "White")).toBe("Alice");
    expect(parsePgnTagInBlock(block, "Black")).toBe("Bob");
  });

  it("lists unique player names", () => {
    const names = listPlayerNamesFromPgn(SAMPLE);
    expect(names).toContain("Alice");
    expect(names).toContain("Carol");
    expect(names.length).toBe(4);
  });
});
