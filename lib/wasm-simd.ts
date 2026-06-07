/** Minimal v128 module probe — validates WebAssembly SIMD (simd128) support. */
const WASM_SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8,
  0, 253, 0, 253, 1, 1, 123, 0, 11,
]);

export function isWasmSimdSupported(): boolean {
  if (typeof WebAssembly === "undefined") return false;
  try {
    return WebAssembly.validate(WASM_SIMD_PROBE);
  } catch {
    return false;
  }
}
