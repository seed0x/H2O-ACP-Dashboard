/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Production: API is on Render (https://h2o-acp-dashboard.onrender.com)
    // Development: Only proxy if NEXT_PUBLIC_API_URL is explicitly set (for local Docker/standalone API server)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // If API URL is configured in development, proxy to it
    if (apiUrl && process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/v1/:path*`,
        },
      ];
    }
    
    // Production: No rewrite needed - frontend calls Render API directly
    // Development: No rewrite if NEXT_PUBLIC_API_URL not set - frontend calls local API directly
    return [];
  }
}

module.exports = nextConfig
