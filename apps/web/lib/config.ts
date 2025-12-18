// Production: Use Render API
// Development: Use local API or NEXT_PUBLIC_API_URL if set
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://h2o-acp-dashboard.onrender.com' 
    : '');

export const API_URL = apiUrl;
export const API_BASE_URL = apiUrl ? `${apiUrl}/api/v1` : '/api/v1';
