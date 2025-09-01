import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // --- TAMBAHAN DI SINI ---
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  typescript: {
    // ⚠️ PERINGATAN KERAS ⚠️
    // Opsi ini akan memaksa build production berhasil meskipun ada type error.
    // Gunakan dengan risiko ditanggung sendiri.
    ignoreBuildErrors: true,
  },
  // ... (config options lain jika ada)
};

export default nextConfig;