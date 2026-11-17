import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Permite abrir el modo desarrollo desde celulares de la red local (npm run movil).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  experimental: {
    // Permite subir fotos tomadas con el celular (suelen pesar varios MB).
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
