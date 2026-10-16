import type { EngineConfig } from "@/lib/analysis";
import type { ProfileOption } from "@/lib/arena-types";

export function testEngineConfig(patch: Partial<EngineConfig> = {}): EngineConfig {
  return {
    name: "test",
    elo: 2000,
    difficulty: 4,
    aggressiveness: 50,
    threads: 2,
    depth: 14,
    timeControl: 500,
    favoriteOpening: "",
    playStyle: "équilibré",
    openings: {},
    ...patch,
  };
}

export function testOption(
  key: string,
  patch: Partial<EngineConfig> = {},
  savedAt = 0
): ProfileOption {
  return {
    key,
    label: key,
    config: testEngineConfig({ name: key, ...patch }),
    savedAt,
  };
}
