import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyFetchFailure,
  fetchErrorCopy,
  withTimeout,
} from "./fetch-errors";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when the promise wins the race", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("rejects with TimeoutError when the deadline passes", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 50, "boom");
    const assertion = expect(pending).rejects.toMatchObject({
      name: "TimeoutError",
      message: "boom",
    });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });
});

describe("classifyFetchFailure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects offline from navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(classifyFetchFailure(new Error("x")).kind).toBe("offline");
  });

  it("detects timeout errors", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const err = new Error("Request timed out");
    err.name = "TimeoutError";
    expect(classifyFetchFailure(err).kind).toBe("timeout");
  });

  it("detects network TypeErrors", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const err = new TypeError("Failed to fetch");
    expect(classifyFetchFailure(err).kind).toBe("network");
  });

  it("detects http status", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(classifyFetchFailure(null, 503).kind).toBe("http");
  });
});

describe("fetchErrorCopy", () => {
  const copy = {
    offline: "OFF",
    timeout: "TO",
    network: "NET",
    generic: "GEN",
  };

  it("maps kinds to copy", () => {
    expect(fetchErrorCopy("offline", copy)).toBe("OFF");
    expect(fetchErrorCopy("timeout", copy)).toBe("TO");
    expect(fetchErrorCopy("network", copy)).toBe("NET");
    expect(fetchErrorCopy("http", copy)).toBe("GEN");
    expect(fetchErrorCopy("unknown", copy)).toBe("GEN");
  });
});
