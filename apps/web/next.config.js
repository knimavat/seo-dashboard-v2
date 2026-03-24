/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@seo-cmd/shared-types', '@seo-cmd/validation'],
  serverExternalPackages: ['mongoose', 'ioredis', 'pino'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

module.exports = nextConfig;
