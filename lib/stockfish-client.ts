"use client";

/**
 * Singleton Stockfish Web Worker with a serialized command queue.
 * High-priority tasks (review, bot moves) run before low-priority UI eval.
 */

const DEBUG =
  typeof window !== "undefined" &&
  (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG;

type QueueTask = () => Promise<void>;
export type StockfishPriority = "high" | "low";

type QueuedItem = {
  task: QueueTask;
  priority: StockfishPriority;
};

export type StockfishSearchCtx<T> = {
  send: (cmd: string) => void;
  stop: () => void;
  onLine: (handler: (line: string) => T | undefined) => void;
};

export type ContinuousPvLine = {
  multipv: number;
  evalPawns: number;
  isMate?: boolean;
  mateInMoves?: number;
  pvUci: string[];
  depth: number;
};

export type ContinuousAnalysisSnapshot = {
  evalPawns: number;
  depth: number;
  lines: ContinuousPvLine[];
};

class StockfishClient {
  private worker: Worker | null = null;
  private ready = false;
  private messageQueue: string[] = [];
  private taskQueue: QueuedItem[] = [];
  private running = false;
  private refCount = 0;
  private readyWaiters: Array<(ok: boolean) => void> = [];
  private idleEvalHandler: ((line: string) => void) | null = null;
  private continuousSessionId = 0;

  acquire(): void {
    this.refCount += 1;
    if (this.refCount === 1) this.initWorker();
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) this.destroyWorker();
  }

  get isReady(): boolean {
    return this.ready;
  }

  get isSearchRunning(): boolean {
    return this.running;
  }

  private initWorker(): void {
    if (this.worker) return;
    try {
      const worker = new Worker("/stockfish.js");
      this.worker = worker;

      worker.onmessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;
        if (DEBUG) console.log("Stockfish:", message);

        if (message.includes("uciok")) worker.postMessage("isready");
        if (message.includes("readyok")) {
          this.ready = true;
          while (this.messageQueue.length > 0) {
            const cmd = this.messageQueue.shift();
            if (cmd) worker.postMessage(cmd);
          }
          const waiters = this.readyWaiters.splice(0);
          waiters.forEach((w) => w(true));
          this.drainQueue();
          return;
        }

        if (!this.running && this.idleEvalHandler) {
          this.idleEvalHandler(message);
        }
      };

      worker.postMessage("uci");
    } catch (error) {
      console.error("Erreur init Stockfish:", error);
      this.ready = false;
      const waiters = this.readyWaiters.splice(0);
      waiters.forEach((w) => w(false));
    }
  }

  private destroyWorker(): void {
    this.taskQueue = [];
    this.running = false;
    this.messageQueue = [];
    this.idleEvalHandler = null;
    this.ready = false;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  waitUntilReady(timeoutMs = 15_000): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    if (!this.worker) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.readyWaiters.indexOf(done);
        if (idx >= 0) this.readyWaiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
      const done = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };
      this.readyWaiters.push(done);
    });
  }

  sendCommand(command: string): void {
    if (!this.worker) return;
    if (this.ready) this.worker.postMessage(command);
    else this.messageQueue.push(command);
  }

  stop(): void {
    this.sendCommand("stop");
  }

  stopContinuousAnalysis(): void {
    this.continuousSessionId += 1;
    if (this.idleEvalHandler) {
      this.stop();
      this.idleEvalHandler = null;
    }
  }

  private canRunIdleAnalysis(): boolean {
    return this.ready && !this.running && this.taskQueue.length === 0;
  }

  private parseInfoLine(line: string): {
    depth: number;
    multipv: number;
    evalPawns: number;
    isMate: boolean;
    mateInMoves: number | null;
    pvUci: string[];
  } | null {
    if (!line.startsWith("info ") || !line.includes(" pv ")) return null;

    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
    if (!depthMatch || !multipvMatch) return null;

    let evalPawns = 0;
    let isMate = false;
    let mateInMoves: number | null = null;

    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    if (cpMatch) {
      evalPawns = parseInt(cpMatch[1], 10) / 100;
    } else {
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        evalPawns = mateIn > 0 ? 10 : -10;
        isMate = true;
        mateInMoves = mateIn;
      }
    }

    const pvIndex = line.indexOf(" pv ");
    const pvPart = line.slice(pvIndex + 4).trim();
    const pvUci = pvPart.split(/\s+/).filter((m) => /^[a-h][1-8][a-h][1-8]/.test(m));

    return {
      depth: parseInt(depthMatch[1], 10),
      multipv: parseInt(multipvMatch[1], 10),
      evalPawns,
      isMate,
      mateInMoves,
      pvUci,
    };
  }

  private buildContinuousSnapshot(
    lineMap: Map<number, ContinuousPvLine>
  ): ContinuousAnalysisSnapshot | null {
    const lines = [...lineMap.values()].sort((a, b) => a.multipv - b.multipv);
    if (lines.length === 0) return null;
    const primary = lines[0]!;
    return {
      evalPawns: primary.evalPawns,
      depth: primary.depth,
      lines,
    };
  }

  requestContinuousAnalysis(
    fen: string,
    onUpdate: (snapshot: ContinuousAnalysisSnapshot) => void,
    opts?: { multipv?: number }
  ): boolean {
    if (!this.canRunIdleAnalysis()) return false;

    this.stopContinuousAnalysis();
    const sessionId = this.continuousSessionId;
    const multipv = opts?.multipv ?? 3;
    const lineMap = new Map<number, ContinuousPvLine>();
    let goSent = false;

    this.idleEvalHandler = (line) => {
      if (sessionId !== this.continuousSessionId) return;
      if (!goSent && line.startsWith("bestmove")) return;

      if (line.startsWith("bestmove")) {
        this.idleEvalHandler = null;
        return;
      }

      if (!goSent) return;

      const parsed = this.parseInfoLine(line);
      if (parsed) {
        lineMap.set(parsed.multipv, {
          multipv: parsed.multipv,
          evalPawns: parsed.evalPawns,
          isMate: parsed.isMate || undefined,
          mateInMoves: parsed.mateInMoves ?? undefined,
          pvUci: parsed.pvUci,
          depth: parsed.depth,
        });
        const snapshot = this.buildContinuousSnapshot(lineMap);
        if (snapshot) onUpdate(snapshot);
      }
    };

    this.sendCommand(`setoption name MultiPV value ${multipv}`);
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand("go infinite");
    goSent = true;
    return true;
  }

  requestIdleAnalysis(
    fen: string,
    depth: number,
    onLine: (line: string) => void
  ): void {
    if (!this.canRunIdleAnalysis()) return;
    this.stopContinuousAnalysis();
    let goSent = false;
    this.idleEvalHandler = (line) => {
      if (!goSent && line.startsWith("bestmove")) return;
      onLine(line);
      if (line.startsWith("bestmove")) {
        this.idleEvalHandler = null;
      }
    };
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);
    goSent = true;
  }

  enqueue<T>(
    run: (ctx: StockfishSearchCtx<T>) => void,
    priority: StockfishPriority = "high"
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = async () => {
        if (!this.worker || !this.ready) {
          reject(new Error("Stockfish not ready"));
          return;
        }

        this.stopContinuousAnalysis();
        this.sendCommand("stop");

        let settled = false;
        let goSent = false;
        let lineHandler: ((line: string) => T | undefined) | null = null;

        const finish = (result: T) => {
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

          if (!goSent && message.startsWith("bestmove")) {
            return;
          }

          const result = lineHandler(message);
          if (result !== undefined) {
            finish(result);
          }
        };

        this.worker.addEventListener("message", listener);

        const ctx: StockfishSearchCtx<T> = {
          send: (cmd) => {
            if (cmd.startsWith("go ")) goSent = true;
            this.sendCommand(cmd);
          },
          stop: () => this.stop(),
          onLine: (handler) => {
            lineHandler = handler;
          },
        };

        try {
          run(ctx);
          if (!lineHandler) {
            fail(new Error("Stockfish search missing onLine handler"));
          }
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      };

      this.taskQueue.push({ task, priority });
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    if (this.running || !this.ready || this.taskQueue.length === 0) return;
    const highIdx = this.taskQueue.findIndex((q) => q.priority === "high");
    const pick = highIdx >= 0 ? highIdx : 0;
    const item = this.taskQueue.splice(pick, 1)[0]!;
    this.running = true;
    void item.task().finally(() => {
      this.running = false;
      this.drainQueue();
    });
  }
}

export const stockfishClient = new StockfishClient();

export type BestMoveAndEvalResult = {
  move: string;
  evalPawns: number;
  isMate?: boolean;
  mateInMoves?: number;
};

export async function stockfishGetBestMoveForFen(
  fen: string,
  depth: number,
  priority: StockfishPriority = "high"
): Promise<string> {
  return stockfishClient.enqueue((ctx) => {
    ctx.onLine((line) => {
      if (line.startsWith("bestmove")) {
        const parts = line.split(/\s+/);
        return parts[1] ?? "";
      }
      return undefined;
    });
    ctx.send(`position fen ${fen}`);
    ctx.send(`go depth ${depth}`);
    setTimeout(() => ctx.stop(), 30_000);
  }, priority);
}

export async function stockfishGetBestMoveAndEval(
  fen: string,
  depth: number,
  priority: StockfishPriority = "high"
): Promise<BestMoveAndEvalResult> {
  return stockfishClient.enqueue((ctx) => {
    let lastEvalPawns: number | null = null;
    let isMate = false;
    let lastMateInMoves: number | null = null;

    ctx.onLine((line) => {
      if (line.includes("score cp")) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
          lastEvalPawns = parseInt(match[1], 10) / 100;
          isMate = false;
          lastMateInMoves = null;
        }
      }
      if (line.includes("score mate")) {
        const match = line.match(/score mate (-?\d+)/);
        if (match) {
          const mateIn = parseInt(match[1], 10);
          lastEvalPawns = mateIn > 0 ? 10 : -10;
          isMate = true;
          lastMateInMoves = mateIn;
        }
      }
      if (line.startsWith("bestmove")) {
        const parts = line.split(/\s+/);
        return {
          move: parts[1] ?? "",
          evalPawns: lastEvalPawns ?? 0,
          isMate: isMate || undefined,
          mateInMoves: lastMateInMoves ?? undefined,
        };
      }
      return undefined;
    });

    ctx.send(`position fen ${fen}`);
    ctx.send(`go depth ${depth}`);
    setTimeout(() => ctx.stop(), 30_000);
  }, priority);
}

export async function stockfishGetPositionEvaluation(
  fen: string,
  depth: number
): Promise<number> {
  return stockfishClient.enqueue((ctx) => {
    let lastEval: number | null = null;
    ctx.onLine((line) => {
      if (line.includes("score cp")) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) lastEval = parseInt(match[1], 10) / 100;
      }
      if (line.startsWith("bestmove")) {
        return lastEval ?? 0;
      }
      return undefined;
    });
    ctx.send(`position fen ${fen}`);
    ctx.send(`go depth ${depth}`);
    setTimeout(() => ctx.stop(), 30_000);
  }, "low");
}
