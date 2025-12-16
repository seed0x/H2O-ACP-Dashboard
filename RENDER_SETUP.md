# 🚀 Render Deployment Guide (Free Tier)

## Step-by-Step Setup

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (free)
3. Connect your GitHub account

### Step 2: Create PostgreSQL Database
1. In Render dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Configure:
   - **Name**: `plumbing-ops-db`
   - **Database**: `plumbing`
   - **User**: `postgres`
   - **Region**: Choose closest to you
   - **Plan**: **Free** (or Starter for $7/month)
4. Click **"Create Database"**
5. **Copy the Internal Database URL** (you'll need this)

### Step 3: Create Web Service (API)
1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `plumbing-ops-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `apps/api`
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: **Free** (or Starter for $7/month)

### Step 4: Set Environment Variables
In the Web Service settings, add these environment variables:

**Required:**
```
DATABASE_URL=<paste-internal-database-url-from-step-2>
ADMIN_PASSWORD=your-secure-password-here
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_ALGORITHM=HS256
ENVIRONMENT=production
CORS_ORIGINS=https://dataflow-eta.vercel.app
```

**How to get DATABASE_URL:**
- Go to your PostgreSQL database in Render
- Click on the database
- Copy the **"Internal Database URL"**
- It looks like: `postgresql://postgres:password@hostname:5432/plumbing`
- **IMPORTANT**: Change `postgresql://` to `postgresql+asyncpg://` for async support

**Example:**
```
postgresql+asyncpg://postgres:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/plumbing
```

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Install dependencies
   - Build your app
   - Start the service
3. Wait for deployment (2-5 minutes)
4. Your API will be at: `https://plumbing-ops-api.onrender.com`

### Step 6: Run Database Migrations
After first deployment:

**Option A: Using Render Shell**
1. Go to your Web Service
2. Click **"Shell"** tab
3. Run:
   ```bash
   cd apps/api
   alembic upgrade head
   ```

**Option B: Using Local Machine**
1. Install Render CLI (optional)
2. Or use psql to connect and run migrations

### Step 7: Update Frontend
Update `apps/web/lib/config.ts`:

```typescript
export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  'https://plumbing-ops-api.onrender.com';
```

Or set in Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://plumbing-ops-api.onrender.com
```

## ✅ Testing

After deployment, test:
- `https://plumbing-ops-api.onrender.com/api/v1/health` - Should return `{"status":"ok"}`
- `https://plumbing-ops-api.onrender.com/api/v1/login` - Login endpoint

## 📝 Important Notes

### Free Tier Limitations:
- ⚠️ **Spins down after 15 minutes** of inactivity
- ⚠️ **First request after spin-down takes ~30 seconds** (cold start)
- ⚠️ **512MB RAM limit**
- ✅ **Unlimited requests** when active
- ✅ **Free PostgreSQL** (90 days, then $7/month or delete/recreate)

### To Keep Free Tier Active:
- Use a service like UptimeRobot (free) to ping your API every 10 minutes
- Or upgrade to Starter plan ($7/month) for always-on

### Database URL Format:
**CRITICAL**: Must use `postgresql+asyncpg://` not `postgresql://`

Render gives you: `postgresql://user:pass@host:port/db`
You need: `postgresql+asyncpg://user:pass@host:port/db`

## 🎯 Quick Checklist

- [ ] Render account created
- [ ] PostgreSQL database created
- [ ] Web Service created
- [ ] Environment variables set (especially DATABASE_URL with `+asyncpg`)
- [ ] Deployment successful
- [ ] Health endpoint works
- [ ] Database migrations run
- [ ] Frontend updated with new API URL
- [ ] Login tested

## 🆘 Troubleshooting

**"Database connection failed"**
- Check DATABASE_URL has `+asyncpg` in it
- Verify database is running in Render
- Check environment variables are set correctly

**"Module not found"**
- Check Root Directory is set to `apps/api`
- Verify requirements.txt is in `apps/api/`

**"Port already in use"**
- Make sure Start Command uses `$PORT` (Render sets this automatically)

**"Cold start slow"**
- Normal for free tier - first request after 15min inactivity is slow
- Consider UptimeRobot to keep it warm, or upgrade to Starter

---

**Time to Deploy**: ~10 minutes
**Cost**: $0/month (free tier)

Your FastAPI app will work perfectly on Render! 🎉

