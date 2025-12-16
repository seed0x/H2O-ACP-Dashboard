/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // In production (Vercel), API runs as serverless function, so no rewrite needed
    // In development, proxy to local API server
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/v1/:path*`,
        },
      ]
    }
    // Production: API handled by Vercel serverless function (no rewrite needed)
    return []
  }
}

module.exports = nextConfig
