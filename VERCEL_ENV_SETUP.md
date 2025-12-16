# Vercel Environment Variables Setup

## ✅ What You Currently Have

From your Vercel dashboard, I can see:
- ✅ `ADMIN_PASSWORD` - Set
- ✅ `JWT_SECRET` - Set
- ✅ Supabase database credentials

## ❌ What's Missing

You need to add these environment variables:

1. **DATABASE_URL** - PostgreSQL connection string
2. **ENVIRONMENT** - Set to "production"
3. **CORS_ORIGINS** - Your Vercel domain
4. **JWT_ALGORITHM** - Optional but recommended

---

## 🔧 Step-by-Step Setup

### Step 1: Get Your Supabase Database URL

From your Supabase dashboard:

1. Go to **Project Settings** → **Database**
2. Find **Connection String** section
3. Select **URI** format
4. Copy the connection string

**Format should be:**
```
postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
```

**Convert to asyncpg format:**
```
postgresql+asyncpg://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
```

**From your variables, I can construct:**
- User: `postgres` (from Database_POSTGRES_USER)
- Password: `bHkyLwIrYYW4F5dE` (from Database_POSTGRES_PASSWORD)
- Host: You need to get this from Supabase dashboard (usually something like `db.xxxxx.supabase.co`)
- Port: `5432` (default)
- Database: Usually `postgres`

### Step 2: Add Missing Environment Variables

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these variables (for **Production** environment):

#### Required Variables

```
DATABASE_URL = postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[SUPABASE-HOST]:5432/postgres
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
JWT_ALGORITHM = HS256
```

**Replace `[SUPABASE-HOST]` with your actual Supabase host** (get from Supabase dashboard)

---

## 📋 Complete Environment Variables List

Here's what you should have in Vercel (Production environment):

### Backend API Variables
```
DATABASE_URL = postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[HOST]:5432/postgres
ADMIN_PASSWORD = change-this-to-your-secure-password
JWT_SECRET = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
JWT_ALGORITHM = HS256
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

### Frontend Variables (Optional - Not Needed)
```
# NEXT_PUBLIC_API_URL - NOT NEEDED!
# API runs as serverless function on same domain
```

### Supabase Variables (Can Keep or Remove)
```
# These are Supabase-specific, you can keep them if needed for other integrations
Database_SUPABASE_JWT_SECRET = ...
Database_POSTGRES_USER = postgres
Database_POSTGRES_PASSWORD = bHkyLwIrYYW4F5dE
NEXT_PUBLIC_Database_SUPABASE_PUBLISHABLE_KEY = ...
Database_SUPABASE_SECRET_KEY = ...
```

---

## 🎯 Quick Action Items

1. **Get Supabase Host:**
   - Go to Supabase Dashboard → Project Settings → Database
   - Find "Connection string" → Copy the hostname

2. **Add DATABASE_URL:**
   - Format: `postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[HOST]:5432/postgres`
   - Replace `[HOST]` with your Supabase host

3. **Add Missing Variables:**
   - `ENVIRONMENT = production`
   - `CORS_ORIGINS = https://dataflow-eta.vercel.app`
   - `JWT_ALGORITHM = HS256`

4. **Update ADMIN_PASSWORD:**
   - Change from `change-this-to-your-secure-password` to a real strong password

---

## ✅ Verification Checklist

After adding variables:
- [ ] DATABASE_URL is set correctly
- [ ] ENVIRONMENT = production
- [ ] CORS_ORIGINS includes your Vercel domain
- [ ] ADMIN_PASSWORD is a strong password
- [ ] JWT_SECRET is set (you have this ✅)
- [ ] JWT_ALGORITHM = HS256

---

Let me help you construct the exact DATABASE_URL...

