# ✅ Vercel Serverless Function - Complete Setup

## 🎯 Perfect! You Have Serverless Functions!

Your API runs as **serverless functions on Vercel** - this is excellent! No separate backend needed.

## ✅ What I've Updated

### 1. Serverless Function Handler (`api/index.py`)
- ✅ Added Python path handling for imports
- ✅ Properly exposes FastAPI app as ASGI handler
- ✅ Works with new `/api/v1` routing

### 2. Dependencies (`api/requirements.txt`)
- ✅ Created requirements file for Vercel to install dependencies
- ✅ Includes all FastAPI, SQLAlchemy, and other dependencies

### 3. Frontend Configuration (`apps/web/lib/config.ts`)
- ✅ Smart detection: Uses same-domain API in Vercel production
- ✅ Falls back to `NEXT_PUBLIC_API_URL` in development
- ✅ No rewrite needed in production (API is serverless function)

### 4. Next.js Config (`apps/web/next.config.js`)
- ✅ Only rewrites in development (for local API)
- ✅ Production uses serverless function directly (no rewrite)

## 🚀 How It Works

### Production (Vercel)
1. **Frontend**: `https://dataflow-eta.vercel.app/` (Next.js)
2. **API Request**: `https://dataflow-eta.vercel.app/api/v1/login`
3. **Vercel Routes**: `/api/(.*)` → `/api/index.py` serverless function
4. **FastAPI Handles**: Processes `/api/v1/login` route
5. **Response**: Returns to frontend

**No separate backend needed!** Everything runs on Vercel.

### Development (Local)
1. **Frontend**: `http://localhost:3000` (Next.js)
2. **API Request**: Next.js rewrites to `http://localhost:8000/api/v1/login`
3. **Backend**: Local FastAPI server handles request
4. **Response**: Returns to frontend

## 📋 Required Vercel Environment Variables

Set these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

### Required
```
DATABASE_URL = postgresql+asyncpg://user:pass@host:port/dbname
ADMIN_PASSWORD = your-admin-password
JWT_SECRET = your-jwt-secret-key
ENVIRONMENT = production
```

### Optional (for CORS)
```
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

### Not Needed!
- ❌ `NEXT_PUBLIC_API_URL` - Not needed! API runs on same domain as serverless function

## 🎯 Deployment Steps

1. **Push to Git** - Vercel auto-deploys
2. **Set Environment Variables** in Vercel dashboard
3. **Run Migrations** (one-time):
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and link
   vercel login
   vercel link
   
   # Pull env vars
   vercel env pull .env.local
   
   # Run migration
   cd apps/api
   alembic upgrade head
   ```

## ✅ Benefits of Serverless Functions

1. **No Separate Backend** - API runs on Vercel
2. **Auto-scaling** - Vercel handles scaling automatically
3. **Cost-effective** - Pay per request
4. **Fast** - Edge functions for low latency
5. **Simple** - One deployment for frontend + API

## 🔍 Testing

After deployment, test:
- ✅ `https://dataflow-eta.vercel.app/api/v1/health` - Should return `{"status":"ok"}`
- ✅ `https://dataflow-eta.vercel.app/api/v1/login` - Login endpoint
- ✅ Frontend pages - Should connect to API automatically

## 📝 Files Updated

- ✅ `api/index.py` - Improved serverless handler
- ✅ `api/requirements.txt` - **NEW** - Dependencies for Vercel
- ✅ `apps/web/lib/config.ts` - Smart API URL detection
- ✅ `apps/web/next.config.js` - Conditional rewrites

---

**Status**: ✅ **READY FOR DEPLOYMENT**

Your serverless function setup is now compatible with all the new API changes!

