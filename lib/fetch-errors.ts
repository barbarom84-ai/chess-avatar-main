import { isBrowserOnline } from "@/lib/offline-sync";

export type FetchErrorKind = "offline" | "timeout" | "network" | "http" | "unknown";

export type ClassifiedFetchError = {
  kind: FetchErrorKind;
  message?: string;
  status?: number;
};

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

/** Abort a promise if it does not settle within `ms`. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_FETCH_TIMEOUT_MS,
  label = "Request timed out"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(label);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function classifyFetchFailure(err: unknown, httpStatus?: number): ClassifiedFetchError {
  if (!isBrowserOnline()) {
    return { kind: "offline" };
  }
  if (typeof httpStatus === "number" && httpStatus > 0) {
    return { kind: "http", status: httpStatus };
  }
  if (err && typeof err === "object") {
    const name = "name" in err ? String((err as { name?: unknown }).name) : "";
    const message =
      "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : undefined;
    if (name === "TimeoutError" || message?.toLowerCase().includes("timed out")) {
      return { kind: "timeout", message };
    }
    if (
      name === "TypeError" ||
      message?.toLowerCase().includes("failed to fetch") ||
      message?.toLowerCase().includes("network")
    ) {
      return { kind: "network", message };
    }
  }
  return { kind: "unknown" };
}

/** Pick user-facing copy for a classified fetch failure. */
export function fetchErrorCopy(
  kind: FetchErrorKind,
  copy: {
    offline: string;
    timeout: string;
    network: string;
    generic: string;
  }
): string {
  switch (kind) {
    case "offline":
      return copy.offline;
    case "timeout":
      return copy.timeout;
    case "network":
      return copy.network;
    default:
      return copy.generic;
  }
}
