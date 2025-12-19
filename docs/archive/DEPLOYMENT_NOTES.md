# Deployment Configuration Notes

## Architecture

- **Frontend**: Deployed on Vercel (`https://dataflow-eta.vercel.app`)
- **API**: Deployed on Render (`https://h2o-acp-dashboard.onrender.com`)

## Required Environment Variables

### Render (API) Environment Variables

The following environment variables must be set in Render dashboard:

```
CORS_ORIGINS=https://dataflow-eta.vercel.app,http://localhost:3000
```

This allows the Vercel frontend to make API requests to Render.

**To set in Render:**
1. Go to Render Dashboard → Your Service → Environment
2. Add `CORS_ORIGINS` with value: `https://dataflow-eta.vercel.app,http://localhost:3000`
3. Save and redeploy

### Vercel (Frontend) Environment Variables

Optional but recommended:

```
NEXT_PUBLIC_API_URL=https://h2o-acp-dashboard.onrender.com
```

If not set, the frontend will automatically use the Render API URL in production.

**To set in Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` with value: `https://h2o-acp-dashboard.onrender.com`
3. Select "Production" environment
4. Save

## CORS Configuration

The API on Render uses the `CORS_ORIGINS` environment variable to allow requests from specific domains. Make sure it includes:
- Your Vercel production domain: `https://dataflow-eta.vercel.app`
- Your Vercel preview domains (if using): `https://*.vercel.app` (wildcard may be needed)
- Local development: `http://localhost:3000`

The CORS middleware is configured in `apps/api/app/main.py` and reads from `settings.cors_origins_list`.

