"use client";

/**
 * ChessAvatar WASM Web Worker — bot moves on chessavatar.net.
 * Analysis / review still use Stockfish (stockfish-client.ts).
 */

import { loadNnueWithCache } from "@/lib/nnue-idb-cache";
import { isWasmSimdSupported } from "@/lib/wasm-simd";
import type { EngineConfig } from "@/lib/analysis";
import { pickForcedHumanBlunder } from "@/lib/bot-move-count";
import {
  multiPvCountForDifficulty,
  pickPersonaBiasedMove,
} from "@/lib/persona-engine-params";
import { trackChessAvatarTelemetry } from "@/lib/chessavatar-telemetry";

export { isWasmSimdSupported } from "@/lib/wasm-simd";

const WORKER_URL = "/chessavatar/worker.js";
const DEFAULT_NNUE_URL = "/chessavatar/nn-default.nnue";

type QueueTask = () => Promise<void>;

type QueuedItem = {
  task: QueueTask;
};

export type ChessAvatarSearchCtx = {
  send: (cmd: string) => void;
  onLine: (handler: (line: string) => string | undefined) => void;
};

export type ChessAvatarSearchStats = {
  depth: number;
  scoreCp: number;
  nodes: number;
  nps: number;
  timeMs: number;
};

class ChessAvatarClient {
  private worker: Worker | null = null;
  private ready = false;
  private initStarted = false;
  private lastError: string | null = null;
  private messageQueue: string[] = [];
  private taskQueue: QueuedItem[] = [];
  private running = false;
  private refCount = 0;
  private readyWaiters: Array<(ok: boolean) => void> = [];
  private playReadyWaiters: Array<(ok: boolean) => void> = [];
  private nnueUrl = DEFAULT_NNUE_URL;
  private nnueLoading = false;
  private nnueReady = false;
  private nnueFailed = false;
  private lastSearchStats: ChessAvatarSearchStats | null = null;
  private engineVersionLabel: string | null = null;

  acquire(): void {
    this.refCount += 1;
    if (this.refCount === 1) void this.initWorker();
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) this.destroyWorker();
  }

  /** UCI handshake complete. */
  get isReady(): boolean {
    return this.ready;
  }

  /** NNUE network loaded (or not required). */
  get isNnueReady(): boolean {
    return this.nnueReady || !this.nnueUrl;
  }

  /** Ready to play with full strength (UCI + NNUE when configured). */
  get isPlayReady(): boolean {
    return this.ready && this.isNnueReady;
  }

  get isNnueLoading(): boolean {
    return this.nnueLoading;
  }

  get isNnueFailed(): boolean {
    return this.nnueFailed;
  }

  get error(): string | null {
    return this.lastError;
  }

  get searchStats(): ChessAvatarSearchStats | null {
    return this.lastSearchStats;
  }

  /** Parsed from UCI `id name` (e.g. "ChessAvatar 0.1.0"). */
  get engineVersion(): string | null {
    return this.engineVersionLabel;
  }

  private parseUciIdentity(message: string): void {
    for (const line of message.split("\n")) {
      const match = line.match(/^id name (.+)/);
      if (match) this.engineVersionLabel = match[1].trim();
    }
  }

  setNnueUrl(url: string): void {
    this.nnueUrl = url;
  }

  private parseInfoLine(line: string): void {
    if (!line.startsWith("info ")) return;
    const depth = line.match(/\bdepth\s+(\d+)/)?.[1];
    const score = line.match(/\bscore\s+cp\s+(-?\d+)/)?.[1];
    const nodes = line.match(/\bnodes\s+(\d+)/)?.[1];
    const nps = line.match(/\bnps\s+(\d+)/)?.[1];
    const time = line.match(/\btime\s+(\d+)/)?.[1];
    if (!depth) return;
    this.lastSearchStats = {
      depth: parseInt(depth, 10),
      scoreCp: score ? parseInt(score, 10) : 0,
      nodes: nodes ? parseInt(nodes, 10) : 0,
      nps: nps ? parseInt(nps, 10) : 0,
      timeMs: time ? parseInt(time, 10) : 0,
    };
  }

  private resolvePlayReadyWaiters(): void {
    if (!this.isPlayReady) return;
    const waiters = this.playReadyWaiters.splice(0);
    waiters.forEach((w) => w(true));
  }

  private beginNnueLoad(): void {
    if (!this.nnueUrl || !this.worker || this.nnueReady || this.nnueLoading) return;
    this.nnueLoading = true;
    void this.loadNnueIntoWorker();
  }

  private async loadNnueIntoWorker(): Promise<void> {
    const worker = this.worker;
    const url = this.nnueUrl;
    if (!worker || !url) return;

    try {
      const bytes = await loadNnueWithCache(url);
      const copy = new Uint8Array(bytes);
      worker.postMessage({ type: "load-nnue", buffer: copy.buffer }, [copy.buffer]);
    } catch (err) {
      console.warn("ChessAvatar NNUE cache load failed, using URL:", err);
      worker.postMessage(`load-nnue ${url}`);
    }
  }

  private async initWorker(): Promise<void> {
    if (this.worker || this.initStarted) return;
    this.initStarted = true;
    this.lastError = null;

    try {
      const worker = new Worker(WORKER_URL, { type: "module" });
      this.worker = worker;

      worker.onmessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;

        if (message.startsWith("error ")) {
          this.lastError = message.slice(6);
          console.warn("ChessAvatar:", this.lastError);
          return;
        }

        if (message === "nnue-loading") {
          this.nnueLoading = true;
          return;
        }

        if (message === "nnue-ready") {
          this.nnueLoading = false;
          this.nnueReady = true;
          this.nnueFailed = false;
          this.resolvePlayReadyWaiters();
          return;
        }

        if (message === "nnue-failed") {
          this.nnueLoading = false;
          this.nnueFailed = true;
          trackChessAvatarTelemetry("chessavatar_nnue_failed");
          this.resolvePlayReadyWaiters();
          return;
        }

        if (message.startsWith("info ")) {
          this.parseInfoLine(message);
          return;
        }

        if (message.includes("uciok")) {
          this.parseUciIdentity(message);
          worker.postMessage("isready");
          return;
        }

        if (message.includes("readyok")) {
          this.ready = true;
          this.lastError = null;
          while (this.messageQueue.length > 0) {
            const cmd = this.messageQueue.shift();
            if (cmd) worker.postMessage(cmd);
          }
          const waiters = this.readyWaiters.splice(0);
          waiters.forEach((w) => w(true));
          this.drainQueue();
          this.beginNnueLoad();
        }
      };

      worker.onerror = (err) => {
        console.error("ChessAvatar worker error:", err);
        const simd = isWasmSimdSupported();
        this.lastError = simd ? "Worker failed to start" : "WASM_SIMD_UNSUPPORTED";
        trackChessAvatarTelemetry("chessavatar_init_failed", {
          reason: this.lastError,
          simdSupported: simd,
        });
        this.ready = false;
        this.initStarted = false;
        const waiters = this.readyWaiters.splice(0);
        waiters.forEach((w) => w(false));
        const playWaiters = this.playReadyWaiters.splice(0);
        playWaiters.forEach((w) => w(false));
      };

      worker.postMessage("uci");
    } catch (error) {
      console.error("ChessAvatar init failed:", error);
      this.lastError = error instanceof Error ? error.message : String(error);
      this.ready = false;
      this.initStarted = false;
      const waiters = this.readyWaiters.splice(0);
      waiters.forEach((w) => w(false));
      const playWaiters = this.playReadyWaiters.splice(0);
      playWaiters.forEach((w) => w(false));
    }
  }

  private destroyWorker(): void {
    this.taskQueue = [];
    this.running = false;
    this.messageQueue = [];
    this.ready = false;
    this.initStarted = false;
    this.lastError = null;
    this.nnueLoading = false;
    this.nnueReady = false;
    this.nnueFailed = false;
    this.lastSearchStats = null;
    this.engineVersionLabel = null;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  waitUntilReady(timeoutMs = 60_000): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    return this.waitFor(this.readyWaiters, timeoutMs, () => this.ready);
  }

  waitUntilPlayReady(timeoutMs = 120_000): Promise<boolean> {
    if (this.isPlayReady) return Promise.resolve(true);
    return this.waitFor(this.playReadyWaiters, timeoutMs, () => this.isPlayReady);
  }

  private waitFor(
    waiters: Array<(ok: boolean) => void>,
    timeoutMs: number,
    isDone: () => boolean
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;

      const poll = () => {
        if (isDone()) {
          resolve(true);
          return;
        }
        if (Date.now() >= deadline) {
          resolve(false);
          return;
        }
        if (!this.worker && this.refCount > 0) {
          void this.initWorker();
          setTimeout(poll, 50);
          return;
        }
        if (!this.worker) {
          resolve(false);
          return;
        }
        const remaining = deadline - Date.now();
        const timer = setTimeout(() => {
          const idx = waiters.indexOf(done);
          if (idx >= 0) waiters.splice(idx, 1);
          resolve(false);
        }, remaining);
        const done = (ok: boolean) => {
          clearTimeout(timer);
          resolve(ok);
        };
        waiters.push(done);
      };

      poll();
    });
  }

  private sendCommand(command: string): void {
    if (!this.worker) return;
    if (this.ready) this.worker.postMessage(command);
    else this.messageQueue.push(command);
  }

  stop(): void {
    this.sendCommand("stop");
  }

  enqueue(run: (ctx: ChessAvatarSearchCtx) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = async () => {
        if (!this.worker || !this.ready) {
          reject(new Error("ChessAvatar engine not ready"));
          return;
        }

        this.sendCommand("stop");

        let settled = false;
        let goSent = false;
        let lineHandler: ((line: string) => string | undefined) | null = null;

        const finish = (result: string) => {
          if (settled) return;
          settled = true;
          this.worker?.removeEventListener("message", listener);
          resolve(result);
        };

        const fail = (err: Error) => {
          if (settled) return;
          settled = true;
          this.worker?.removeEventListener("message", listener);
          reject(err);
        };

        const listener = (e: MessageEvent) => {
          const message = e.data;
          if (typeof message !== "string" || !lineHandler) return;

          if (message.startsWith("error ")) {
            fail(new Error(message.slice(6)));
            return;
          }

          if (message.startsWith("info ")) {
            this.parseInfoLine(message);
            if (lineHandler) {
              const result = lineHandler(message);
              if (result !== undefined) finish(result);
            }
            return;
          }

          if (!goSent && message.startsWith("bestmove")) {
            return;
          }

          const result = lineHandler(message);
          if (result !== undefined) {
            finish(result);
          }
        };

        this.worker.addEventListener("message", listener);

        const ctx: ChessAvatarSearchCtx = {
          send: (cmd) => {
            if (cmd.startsWith("go ")) goSent = true;
            this.sendCommand(cmd);
          },
          onLine: (handler) => {
            lineHandler = handler;
          },
        };

        try {
          run(ctx);
          if (!lineHandler) {
            fail(new Error("ChessAvatar search missing onLine handler"));
          }
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      };

      this.taskQueue.push({ task });
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    if (this.running || !this.ready || this.taskQueue.length === 0) return;
    const item = this.taskQueue.shift()!;
    this.running = true;
    void item.task().finally(() => {
      this.running = false;
      this.drainQueue();
    });
  }
}

export const chessAvatarClient = new ChessAvatarClient();

export type ChessAvatarMoveOptions = {
  skillLevel: number;
  depth: number;
  movetime: number;
  hashMb?: number;
  difficulty?: number;
  elo?: number;
  /** Enables MultiPV persona biasing (same logic as Stockfish bot path). */
  personaConfig?: EngineConfig;
  multiPv?: number;
  humanBlunder?: boolean;
};

/** @internal exported for unit tests */
export function parseChessAvatarMultiPvLine(
  line: string,
  lineMoves: Map<number, string>
): void {
  if (!line.startsWith("info ") || !line.includes(" pv ")) return;
  const mp = line.match(/\bmultipv\s+(\d+)/i);
  const pvMatch = line.match(/\bpv\s+(\S+)/);
  if (mp && pvMatch) {
    const idx = parseInt(mp[1], 10);
    const first = pvMatch[1];
    if (first && /^[a-h][1-8][a-h][1-8]/.test(first)) lineMoves.set(idx, first);
  }
}

/** Depth ceiling + think time (iterative deepening stops on movetime). */
export function webSearchLimits(
  depth: number,
  movetimeMs: number,
  difficulty = 3,
  elo?: number
): { depth: number; movetime: number } {
  const maxDepth = Math.min(Math.max(4, depth), 22);

  let movetime = Math.max(200, movetimeMs);

  if (elo != null && elo >= 3200) movetime = Math.max(movetime, 18_000);
  else if (elo != null && elo >= 2800) movetime = Math.max(movetime, 12_000);
  else if (elo != null && elo >= 2400) movetime = Math.max(movetime, 8000);
  else if (difficulty >= 5) movetime = Math.max(movetime, 6000);
  else if (difficulty >= 4) movetime = Math.max(movetime, 3500);
  else if (difficulty >= 3) movetime = Math.max(movetime, 1200);

  movetime = Math.min(movetime, 30_000);

  return { depth: maxDepth, movetime };
}

export async function chessAvatarGetBestMove(
  fen: string,
  opts: ChessAvatarMoveOptions
): Promise<string> {
  const { depth, movetime } = webSearchLimits(
    opts.depth,
    opts.movetime,
    opts.difficulty,
    opts.elo
  );
  const hashMb = Math.min(opts.hashMb ?? 64, 64);
  const personaConfig = opts.personaConfig;
  const baseMultiPv =
    opts.multiPv ??
    (personaConfig ? multiPvCountForDifficulty(personaConfig.difficulty) : 1);
  const effectiveMultiPv = opts.humanBlunder ? Math.max(baseMultiPv, 4) : baseMultiPv;

  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[ChessAvatar] go depth ${depth} movetime ${movetime}ms hash ${hashMb}MB multipv ${effectiveMultiPv}`
    );
  }

  return chessAvatarClient.enqueue((ctx) => {
    const lineMoves = new Map<number, string>();

    ctx.onLine((line) => {
      if (effectiveMultiPv > 1) parseChessAvatarMultiPvLine(line, lineMoves);

      if (line.startsWith("bestmove")) {
        const parts = line.split(/\s+/);
        let move = parts[1] && parts[1] !== "(none)" ? parts[1] : "";
        if (effectiveMultiPv > 1 && move && personaConfig) {
          move = opts.humanBlunder
            ? pickForcedHumanBlunder(move, lineMoves)
            : pickPersonaBiasedMove(move, lineMoves, personaConfig);
        }
        if (effectiveMultiPv > 1) {
          ctx.send("setoption name MultiPV value 1");
        }
        return move;
      }
      return undefined;
    });

    ctx.send(`setoption name Skill Level value ${opts.skillLevel}`);
    ctx.send(`setoption name Hash value ${hashMb}`);
    if (effectiveMultiPv > 1) {
      ctx.send(`setoption name MultiPV value ${effectiveMultiPv}`);
    } else {
      ctx.send("setoption name MultiPV value 1");
    }
    ctx.send(`position fen ${fen}`);
    ctx.send(`go depth ${depth} movetime ${movetime}`);
    setTimeout(() => ctx.send("stop"), movetime + 2000);
  });
}
