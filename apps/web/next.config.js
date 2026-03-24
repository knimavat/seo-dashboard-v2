/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@seo-cmd/shared-types', '@seo-cmd/validation'],
  serverExternalPackages: ['mongoose', 'ioredis', 'pino'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return [
      { source: '/api/v1/:path*', destination: `${apiUrl.replace('/api/v1', '')}/:path*` },
    ];
  },
};

module.exports = nextConfig;
