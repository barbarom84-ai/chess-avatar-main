import { describe, expect, it } from "vitest";
import { ownAccountAvatarPath } from "@/lib/account-server";
import { clampAvatarCrop } from "@/lib/avatar-upload";

const SB = "https://proj.supabase.co";
const USER = "5f7eefc1-a8ba-4c2e-8e72-2d012511a725";
const publicUrl = (path: string) => `${SB}/storage/v1/object/public/account-avatars/${path}`;

describe("ownAccountAvatarPath", () => {
  it("accepts a file in the user's own folder, with or without a cache-busting query", () => {
    expect(ownAccountAvatarPath(publicUrl(`${USER}/avatar-1.jpg`), USER, SB)).toBe(`${USER}/avatar-1.jpg`);
    expect(ownAccountAvatarPath(`${publicUrl(`${USER}/avatar.jpg`)}?v=123`, USER, SB)).toBe(`${USER}/avatar.jpg`);
  });

  it("rejects other hosts, other users, other buckets and path tricks", () => {
    expect(ownAccountAvatarPath("https://evil.example.com/track.gif", USER, SB)).toBeNull();
    expect(ownAccountAvatarPath(`https://evil.example.com/storage/v1/object/public/account-avatars/${USER}/a.jpg`, USER, SB)).toBeNull();
    expect(ownAccountAvatarPath(publicUrl("someone-else/avatar.jpg"), USER, SB)).toBeNull();
    expect(ownAccountAvatarPath(`${SB}/storage/v1/object/public/other-bucket/${USER}/a.jpg`, USER, SB)).toBeNull();
    expect(ownAccountAvatarPath(publicUrl(`${USER}/../someone-else/a.jpg`), USER, SB)).toBeNull();
    expect(ownAccountAvatarPath(publicUrl(`${USER}/nested/a.jpg`), USER, SB)).toBeNull();
    expect(ownAccountAvatarPath("javascript:alert(1)", USER, SB)).toBeNull();
    expect(ownAccountAvatarPath("not a url", USER, SB)).toBeNull();
  });
});

describe("clampAvatarCrop", () => {
  it("keeps a landscape image covering the circle horizontally only", () => {
    // 2000x1000 fitted to 280px: 560x280, so 140px of horizontal slack each side and none vertically.
    expect(clampAvatarCrop(2000, 1000, 280, { scale: 1, panX: 500, panY: 50 })).toEqual({ scale: 1, panX: 140, panY: 0 });
    expect(clampAvatarCrop(2000, 1000, 280, { scale: 1, panX: -60, panY: -50 })).toEqual({ scale: 1, panX: -60, panY: 0 });
  });

  it("allows more pan when zoomed in", () => {
    // Square image at 2x: 560px, 140px of slack in both directions.
    expect(clampAvatarCrop(1024, 1024, 280, { scale: 2, panX: 300, panY: -300 })).toEqual({ scale: 2, panX: 140, panY: -140 });
  });
});
