import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Security headers (the "helmet" layer for a Next.js app): they instruct the
// browser to block clickjacking, MIME sniffing, and leaking referrer data.
// Our app is same-origin (frontend + API on one server), so a permissive CORS
// setup is not needed at all — the browser never makes cross-origin calls.
// ---------------------------------------------------------------------------
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
