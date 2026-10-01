import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright's dev server sets this so it doesn't collide with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
