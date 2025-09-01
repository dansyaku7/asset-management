import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // --- TAMBAHAN DI SINI ---
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // ... (config options lain jika ada)
};

export default nextConfig;