import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan ini untuk memastikan policy diterapkan ke semua rute
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // Tambahkan blob: ke img-src dan connect-src
            value: "img-src 'self' data: blob: https:; connect-src 'self' https: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
  // Izinkan eksekusi gambar eksternal jika perlu
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;