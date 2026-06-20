import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withPWA({
  dest: "public",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanUpOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "font-cache",
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      {
        urlPattern: /^https?.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "http-cache",
          networkTimeoutSeconds: 8,
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
    ],
  },
})(nextConfig);
