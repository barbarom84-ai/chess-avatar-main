import { describe, expect, it } from "vitest";
import { latestPresenceByUser } from "./realtime-observer";

describe("latestPresenceByUser", () => {
  it("keeps the latest entry per user, most recent first", () => {
    const list = latestPresenceByUser({
      a: [
        { user_id: "u1", page: "/", last_seen: "2026-10-11T08:00:00.000Z" },
        { user_id: "u1", page: "/arena", last_seen: "2026-10-11T08:05:00.000Z" },
      ],
      b: [{ user_id: "u2", page: "/online", last_seen: "2026-10-11T08:01:00.000Z" }],
    });
    expect(list.map((p) => [p.user_id, p.page])).toEqual([
      ["u1", "/arena"],
      ["u2", "/online"],
    ]);
  });

  it("ignores malformed presence entries instead of crashing", () => {
    const list = latestPresenceByUser({
      observer: [{ presence_ref: "x" }],
      broken: [null, { user_id: "u3", page: "/" }],
      missing: undefined,
      ok: [{ user_id: "u4", page: "/", last_seen: "2026-10-11T08:00:00.000Z" }],
    } as Record<string, unknown[] | undefined>);
    expect(list.map((p) => p.user_id)).toEqual(["u4"]);
  });
});
