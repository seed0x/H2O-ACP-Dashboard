// API runs as serverless function on same domain (Vercel production or vercel dev)
// Only use separate API URL if explicitly configured (for Docker/local API server)
// Default to empty string (same domain) to work with serverless functions
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

export const API_URL = apiUrl;
export const API_BASE_URL = apiUrl ? `${apiUrl}/api/v1` : '/api/v1';
