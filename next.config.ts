import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Semua request ke /api/backend/* diteruskan ke PHP server
        // Browser hanya melihat port 3000 → session cookie bekerja normal
        source: "/api/backend/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
