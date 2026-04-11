import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Suppress hydration warnings caused by browser extensions
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Allow Clerk-hosted images (for avatars, logos, etc.)
  images: {
    domains: ["images.clerk.dev", "www.clerk.dev"],
  },
  // Add headers to fix CSP issues with Clerk and Razorpay
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.dev https://*.clerk.accounts.dev https://*.googletagmanager.com https://checkout.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
              "worker-src 'self' blob: https://*.clerk.dev",
              "style-src 'self' 'unsafe-inline' https://*.clerk.dev https://*.razorpay.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https:",
              "connect-src 'self' https://*.clerk.dev https://*.clerk.accounts.dev https://*.razorpay.com https://checkout.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com wss://*.clerk.accounts.dev https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net",
              "frame-src 'self' https://*.clerk.dev https://*.clerk.accounts.dev https://api.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com/recaptcha/",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig

