/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Default: API runs as serverless function on same domain (no rewrite needed)
    // Only proxy if NEXT_PUBLIC_API_URL is explicitly set (for Docker/local API server)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If API URL is configured, proxy to it (for local Docker/standalone API server)
    if (apiUrl && process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/v1/:path*`,
        },
      ];
    }
    
    // Default: no rewrite - serverless function handles /api/* routes
    return [];
  }
}

module.exports = nextConfig
