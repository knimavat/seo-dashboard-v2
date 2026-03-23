/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    return [
      { source: '/api/v1/:path*', destination: `${apiUrl.replace('/api/v1', '')}/:path*` },
    ];
  },
};

module.exports = nextConfig;