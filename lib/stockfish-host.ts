/**
 * Shared Stockfish WASM worker — one process per tab, reused across Play /
 * Arena / Review remounts (React Strict Mode, client navigations).
 */

export type StockfishHandle = {
  post: (command: string) => void;
  subscribe: (fn: (message: string) => void) => () => void;
  isReady: () => boolean;
};

type MsgFn = (message: string) => void;

let worker: Worker | null = null;
let refs = 0;
let ready = false;
let terminateTimer: ReturnType<typeof setTimeout> | null = null;
const readyWaiters: Array<() => void> = [];
const pendingCommands: string[] = [];
const handlers = new Set<MsgFn>();

function ensureWorker() {
  if (typeof window === "undefined") return;
  if (worker) return;
  try {
    worker = new Worker("/stockfish.js");
  } catch (error) {
    console.error("Erreur init Stockfish:", error);
    return;
  }
  worker.onmessage = (e: MessageEvent) => {
    const message = e.data;
    if (typeof message !== "string") return;
    if (message.includes("uciok")) worker?.postMessage("isready");
    if (message.includes("readyok") && !ready) {
      ready = true;
      for (const cmd of pendingCommands.splice(0)) worker?.postMessage(cmd);
      for (const w of readyWaiters.splice(0)) w();
    }
    handlers.forEach((h) => h(message));
  };
  worker.postMessage("uci");
}

export function acquireStockfish(): StockfishHandle {
  if (terminateTimer) {
    clearTimeout(terminateTimer);
    terminateTimer = null;
  }
  refs += 1;
  ensureWorker();
  return {
    isReady: () => ready,
    post(command) {
      if (!worker) return;
      if (ready) worker.postMessage(command);
      else pendingCommands.push(command);
    },
    subscribe(fn) {
      handlers.add(fn);
      return () => {
        handlers.delete(fn);
      };
    },
  };
}

export function releaseStockfish() {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  terminateTimer = setTimeout(() => {
    worker?.terminate();
    worker = null;
    ready = false;
    handlers.clear();
    pendingCommands.length = 0;
    readyWaiters.length = 0;
    terminateTimer = null;
  }, 12_000);
}
