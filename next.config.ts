import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
              "style-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https: http: ws: wss:",
              "font-src 'self' data: https: http:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
              "frame-src 'self' https://generator.artblocks.io https://*.artblocks.io"
            ].join('; ')
          }
        ]
      }
    ]
  }
};

export default nextConfig;
