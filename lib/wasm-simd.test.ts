import { describe, expect, it } from "vitest";
import { isWasmSimdSupported } from "./wasm-simd";

describe("isWasmSimdSupported", () => {
  it("returns a boolean", () => {
    expect(typeof isWasmSimdSupported()).toBe("boolean");
  });
});
