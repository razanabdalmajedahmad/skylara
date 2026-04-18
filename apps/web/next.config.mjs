/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudfront.net'
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com'
      }
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_BASE_URL || 'http://localhost:3001/api',
    NEXT_PUBLIC_STRIPE_KEY: process.env.STRIPE_PUBLIC_KEY,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.MAPBOX_API_TOKEN,
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || '0.1.0',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    NEXT_PUBLIC_WS_URL: process.env.WS_URL || 'ws://localhost:3001'
  },
  experimental: {
    optimizePackageImports: ['@repo/ui', '@repo/types', '@repo/config']
  }
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  importScripts: ['/push-sw.js'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.cloudfront\.net\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    {
      urlPattern: /^https?:\/\/localhost:3001.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5 // 5 minutes
        }
      }
    }
  ]
});

export default pwaConfig(nextConfig);
