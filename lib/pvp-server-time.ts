export type ServerTimeAnchor = {
  serverMs: number;
  perfMs: number;
};

/** Estime le décalage horloge client ↔ serveur (ms) depuis l'en-tête Date HTTP. */
export function estimateServerOffsetMs(response: Response, receivedAtMs = Date.now()): number | null {
  const dateHeader = response.headers.get("date");
  if (!dateHeader) return null;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isFinite(serverMs)) return null;
  return serverMs - receivedAtMs;
}

/** Décalage serveur ↔ client en compensant la moitié du RTT. */
export function computeServerOffsetMs(
  serverNow: number,
  requestStartedAtMs: number,
  responseReceivedAtMs: number
): number {
  const midpoint = requestStartedAtMs + (responseReceivedAtMs - requestStartedAtMs) / 2;
  return serverNow - midpoint;
}

export function createServerTimeAnchor(serverMs: number, perfMs = performance.now()): ServerTimeAnchor {
  return { serverMs, perfMs };
}

export function nowFromServerAnchor(anchor: ServerTimeAnchor | null): number {
  if (anchor == null) return Date.now();
  return anchor.serverMs + (performance.now() - anchor.perfMs);
}

export function applyServerOffset(nowMs: number, offsetMs: number | null): number {
  if (offsetMs == null || !Number.isFinite(offsetMs)) return nowMs;
  return nowMs + offsetMs;
}

export function syncAnchorFromResponse(input: {
  serverNow: number | null;
  response: Response;
  requestStartedAtMs: number;
  responseReceivedAtMs: number;
}): ServerTimeAnchor | null {
  if (input.serverNow != null && Number.isFinite(input.serverNow)) {
    const midpoint =
      input.requestStartedAtMs + (input.responseReceivedAtMs - input.requestStartedAtMs) / 2;
    const oneWayLatency = input.responseReceivedAtMs - midpoint;
    return createServerTimeAnchor(input.serverNow + oneWayLatency);
  }
  const headerOffset = estimateServerOffsetMs(input.response, input.responseReceivedAtMs);
  if (headerOffset == null) return null;
  return createServerTimeAnchor(input.responseReceivedAtMs + headerOffset);
}
