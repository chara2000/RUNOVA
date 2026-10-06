import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Turbopack root (resolves workspace warning) ─────────────────────────
  turbopack: {
    root: __dirname,
  },

  // ─── Image optimization ──────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zoywwhhpipswfpigdlnb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ─── Security + performance headers ─────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Block MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — disable microphone, camera, geolocation (not needed by app)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS — enforce HTTPS for 1 year in production
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Supabase API + auth
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
              // Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Images
              "img-src 'self' data: blob: https://*.supabase.co",
              // Workers for potential WASM FIT parsing
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ─── Redirects ────────────────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: "/app",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // ─── Compiler options ─────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // ─── Logging ──────────────────────────────────────────────────────────────
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
