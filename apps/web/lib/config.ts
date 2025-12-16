// In production (Vercel), API runs as serverless function on same domain
// In development, use localhost or configured API URL
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

export const API_URL = isProduction && isVercel 
  ? '' // Same domain in Vercel (serverless function)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export const API_BASE_URL = `${API_URL}/api/v1`;
