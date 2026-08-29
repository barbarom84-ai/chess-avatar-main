import packageJson from "../package.json";

export const APP_NAME = "Chess Avatar";
export const APP_VERSION = packageJson.version;

/** Short git SHA in production (Vercel), or `dev` locally. */
export const APP_BUILD =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  "dev";
