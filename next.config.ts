import type { NextConfig } from "next";

// Fully static site: `npm run build` writes plain HTML/CSS/JS to `out/`,
// which Vercel (or any static host) can serve with no server or database.
const nextConfig: NextConfig = { output: "export" };

export default nextConfig;
