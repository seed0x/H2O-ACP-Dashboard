# Deployment Guide for Vercel (Frontend) + Render (Backend)

This guide covers deploying the Plumbing Ops Platform to Vercel (frontend) and Render (backend).

## Architecture

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: FastAPI app deployed on Render
- **Database**: PostgreSQL (Supabase, Render, or Railway)

## Prerequisites

1. GitHub repository with your code
2. Vercel account (free tier works)
3. Render account (free tier works)
4. PostgreSQL database (Supabase recommended for free tier)

## Step 1: Set Up Database

### Option A: Supabase (Recommended - Free Tier)

1. Go to https://supabase.com
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
5. Note: You'll need to change `postgresql://` to `postgresql+asyncpg://` for async operations

### Option B: Render PostgreSQL

1. Go to Render Dashboard
2. Create **New** → **PostgreSQL**
3. Copy the **Internal Database URL**

## Step 2: Deploy Backend to Render

### 2.1 Create Render Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `plumbing-api`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./apps/api/Dockerfile`
   - **Docker Context**: `./apps/api`
   - **Docker Command**: `/app/docker-entrypoint.sh`
   - **Plan**: Free (or paid for better performance)

### 2.2 Set Environment Variables in Render

Go to **Environment** tab and add:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
ADMIN_PASSWORD=your-strong-password-here
JWT_SECRET=generate-with-openssl-rand-hex-32
JWT_ALGORITHM=HS256
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Important Notes:**
- Replace `your-vercel-app.vercel.app` with your actual Vercel domain
- Generate `JWT_SECRET` using: `openssl rand -hex 32`
- `DATABASE_URL` must use `postgresql+asyncpg://` protocol
- `CORS_ORIGINS` must include your Vercel domain

### 2.3 Deploy

1. Click **Create Web Service**
2. Render will build and deploy automatically
3. Wait for deployment to complete
4. Note your Render service URL (e.g., `https://plumbing-api.onrender.com`)

### 2.4 Verify Backend

1. Visit: `https://your-render-url.onrender.com/health`
2. Should return: `{"status":"ok"}`

## Step 3: Deploy Frontend to Vercel

### 3.1 Connect Repository

1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (IMPORTANT!)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`

### 3.2 Set Environment Variables in Vercel

Go to **Settings** → **Environment Variables** and add:

```env
NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com
```

Replace `your-render-url.onrender.com` with your actual Render API URL.

### 3.3 Deploy

1. Click **Deploy**
2. Vercel will build and deploy automatically
3. Wait for deployment to complete
4. Note your Vercel domain (e.g., `https://plumbing-ops.vercel.app`)

### 3.4 Update Render CORS

After getting your Vercel URL, update the `CORS_ORIGINS` in Render:

1. Go to Render Dashboard → Your Service → **Environment**
2. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   https://your-vercel-app.vercel.app,http://localhost:3000
   ```
3. Save and redeploy

## Step 4: Run Database Migrations

### Option A: Using Render Shell (Recommended)

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:
   ```bash
   cd /app
   alembic upgrade head
   ```

### Option B: Using Local Machine

1. Set up local environment:
   ```bash
   cd apps/api
   pip install -r requirements.txt
   ```
2. Set `DATABASE_URL` environment variable
3. Run:
   ```bash
   alembic upgrade head
   ```

## Step 5: Verify Deployment

1. **Backend Health Check**: `https://your-render-url.onrender.com/health`
2. **Frontend**: Visit your Vercel URL
3. **Login**: Use username `admin` and your `ADMIN_PASSWORD`

## Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Check `DATABASE_URL` is correct
- Ensure database is accessible from Render
- For Supabase: Check connection pooling settings

**Migrations Failed:**
- Run migrations manually in Render Shell
- Check database permissions

**CORS Errors:**
- Verify `CORS_ORIGINS` includes your Vercel domain
- Check for typos in domain names
- Ensure no trailing slashes

### Frontend Issues

**API Connection Failed:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check browser console for errors
- Ensure Render backend is running

**Build Failed:**
- Check Root Directory is set to `apps/web`
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

## Environment Variables Reference

### Render (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (use `postgresql+asyncpg://`) |
| `ADMIN_PASSWORD` | Yes | Password for admin user |
| `JWT_SECRET` | Yes | Secret for JWT tokens (generate with `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | No | JWT algorithm (default: HS256) |
| `ENVIRONMENT` | No | Environment name (default: production) |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed origins |
| `FRONTEND_URL` | No | Frontend URL for review links |

### Vercel (Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Full URL to Render API (e.g., `https://api.onrender.com`) |

## Next Steps

1. Set up custom domains (optional)
2. Configure email/SMTP for review requests (optional)
3. Set up storage (S3/R2) for file uploads (optional)
4. Configure monitoring and alerts

## Support

For issues:
1. Check Render logs: Dashboard → Your Service → **Logs**
2. Check Vercel logs: Dashboard → Your Project → **Deployments** → Click deployment → **View Function Logs**
3. Check browser console for frontend errors

