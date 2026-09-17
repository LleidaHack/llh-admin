import type { NextConfig } from "next";

// The /api proxy lives in src/app/api/[...path]/route.ts (a Route Handler), not a
// rewrite, so trailing slashes required by the backend are preserved. API_TARGET
// is read there (server-only) and never exposed to the browser.
const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md agent-rule files in the repo.
  agentRules: false,
  // Don't 308-redirect "/api/v1/event/" to "/api/v1/event" before it reaches the
  // proxy route handler; the backend needs the trailing slash preserved.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
