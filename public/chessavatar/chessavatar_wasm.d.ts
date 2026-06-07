/* tslint:disable */
/* eslint-disable */

export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    go_depth(depth: number): string;
    is_ready(): string;
    load_nnue_bytes(bytes: Uint8Array): void;
    constructor();
    position(fen: string, moves_json: string): void;
    set_hash_mb(mb: number): void;
    set_skill_level(level: number): void;
    stop(): void;
    uci(): string;
}

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly init: () => void;
    readonly wasmengine_go_depth: (a: number, b: number, c: number) => void;
    readonly wasmengine_is_ready: (a: number, b: number) => void;
    readonly wasmengine_load_nnue_bytes: (a: number, b: number, c: number, d: number) => void;
    readonly wasmengine_new: () => number;
    readonly wasmengine_position: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly wasmengine_set_hash_mb: (a: number, b: number) => void;
    readonly wasmengine_set_skill_level: (a: number, b: number) => void;
    readonly wasmengine_stop: (a: number) => void;
    readonly wasmengine_uci: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
