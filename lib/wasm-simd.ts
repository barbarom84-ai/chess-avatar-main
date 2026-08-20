/**
 * Detect WebAssembly SIMD (simd128) support.
 * Uses probes from GoogleChromeLabs/wasm-feature-detect (our old probe was invalid on modern engines).
 */

const SIMD_PROBE_BYTES: readonly (readonly number[])[] = [
  // wasm-feature-detect / nutrient.io
  [
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0,
    65, 0, 253, 15, 253, 98, 11,
  ],
  // TensorFlow.js wasm backend
  [
    0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0,
    253, 15, 26, 11,
  ],
];

export function isWasmSimdSupported(): boolean {
  if (typeof WebAssembly === "undefined" || typeof WebAssembly.validate !== "function") {
    return false;
  }
  try {
    return SIMD_PROBE_BYTES.some((bytes) =>
      WebAssembly.validate(new Uint8Array(bytes))
    );
  } catch {
    return false;
  }
}
