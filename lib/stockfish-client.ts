"use client";

/**
 * Singleton Stockfish Web Worker with a serialized command queue.
 * All consumers share one WASM instance to reduce memory and avoid listener races.
 */

const DEBUG =
  typeof window !== "undefined" &&
  (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG;

type QueueTask = () => Promise<void>;

class StockfishClient {
  private worker: Worker | null = null;
  private ready = false;
  private messageQueue: string[] = [];
  private taskQueue: QueueTask[] = [];
  private running = false;
  private refCount = 0;
  private readyWaiters: Array<(ok: boolean) => void> = [];

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

  /**
   * Run one engine interaction at a time. The handler receives each UCI line
   * and returns a value when the interaction is complete (typically on bestmove).
   */
  enqueue<T>(
    run: (ctx: {
      send: (cmd: string) => void;
      stop: () => void;
      onLine: (handler: (line: string) => T | undefined) => void;
    }) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = async () => {
        if (!this.worker || !this.ready) {
          reject(new Error("Stockfish not ready"));
          return;
        }
        let settled = false;
        let lineHandler: ((line: string) => T | undefined) | null = null;

        const listener = (e: MessageEvent) => {
          const message = e.data;
          if (typeof message !== "string" || !lineHandler) return;
          const result = lineHandler(message);
          if (result !== undefined && !settled) {
            settled = true;
            this.worker?.removeEventListener("message", listener);
            resolve(result);
          }
        };

        this.worker.addEventListener("message", listener);

        try {
          await run({
            send: (cmd) => this.sendCommand(cmd),
            stop: () => this.stop(),
            onLine: (handler) => {
              lineHandler = handler;
            },
          });
          if (!settled) {
            this.worker?.removeEventListener("message", listener);
            reject(new Error("Stockfish search ended without result"));
          }
        } catch (err) {
          if (!settled) {
            settled = true;
            this.worker?.removeEventListener("message", listener);
            reject(err);
          }
        }
      };

      this.taskQueue.push(task);
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    if (this.running || !this.ready || this.taskQueue.length === 0) return;
    this.running = true;
    const task = this.taskQueue.shift()!;
    void task().finally(() => {
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
  depth: number
): Promise<string> {
  return stockfishClient.enqueue((ctx) => {
    return new Promise((resolve, reject) => {
      ctx.onLine((line) => {
        if (line.startsWith("bestmove")) {
          const parts = line.split(/\s+/);
          return parts[1] ?? "";
        }
        return undefined;
      });
      ctx.stop();
      ctx.send(`position fen ${fen}`);
      ctx.send(`go depth ${depth}`);
      setTimeout(() => {
        if (!stockfishClient.isReady) reject(new Error("Stockfish not ready"));
        else ctx.stop();
      }, 30_000);
    });
  });
}

export async function stockfishGetBestMoveAndEval(
  fen: string,
  depth: number
): Promise<BestMoveAndEvalResult> {
  return stockfishClient.enqueue((ctx) => {
    return new Promise((resolve) => {
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

      ctx.stop();
      ctx.send(`position fen ${fen}`);
      ctx.send(`go depth ${depth}`);
      setTimeout(() => ctx.stop(), 30_000);
    });
  });
}

export async function stockfishGetPositionEvaluation(
  fen: string,
  depth: number
): Promise<number> {
  return stockfishClient.enqueue((ctx) => {
    return new Promise((resolve) => {
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
    });
  });
}
