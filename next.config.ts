import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev/preview server run without clashing with the main `.next` folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
