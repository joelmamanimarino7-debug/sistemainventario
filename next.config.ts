import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  experimental: {
    // Permite subir fotos tomadas con el celular (suelen pesar varios MB).
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
