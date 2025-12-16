# Vercel Environment Variables - Complete Checklist

## 🔍 Current Status

### ✅ You Have:
- `ADMIN_PASSWORD` = change-this-to-your-secure-password
- `JWT_SECRET` = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
- Supabase credentials (user, password, keys)

### ❌ You Need to Add:
1. `DATABASE_URL` - PostgreSQL connection string
2. `ENVIRONMENT` = production
3. `CORS_ORIGINS` = https://dataflow-eta.vercel.app
4. `JWT_ALGORITHM` = HS256

---

## 📝 Step-by-Step Instructions

### Step 1: Get Supabase Connection String

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **URI** tab
6. Copy the connection string

**It will look like:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Step 2: Convert to AsyncPG Format

Change `postgresql://` to `postgresql+asyncpg://`

**Example:**
```
postgresql+asyncpg://postgres.bHkyLwIrYYW4F5dE:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**OR use the direct connection (port 5432):**
```
postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Step 3: Add Variables to Vercel

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

**Add these (Production environment):**

```
DATABASE_URL = [your-connection-string-from-step-2]
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
JWT_ALGORITHM = HS256
```

### Step 4: Update ADMIN_PASSWORD

**Important:** Change `ADMIN_PASSWORD` from `change-this-to-your-secure-password` to a real strong password!

---

## 🎯 Complete Variable List

Here's your complete setup:

### Backend (Required)
```
DATABASE_URL = postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres
ADMIN_PASSWORD = [CHANGE-TO-STRONG-PASSWORD]
JWT_SECRET = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
JWT_ALGORITHM = HS256
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

### Optional (Can Keep)
```
# Supabase-specific (keep if using Supabase features)
Database_SUPABASE_JWT_SECRET = ...
Database_POSTGRES_USER = postgres
Database_POSTGRES_PASSWORD = bHkyLwIrYYW4F5dE
NEXT_PUBLIC_Database_SUPABASE_PUBLISHABLE_KEY = ...
Database_SUPABASE_SECRET_KEY = ...
```

---

## ✅ After Adding Variables

1. **Redeploy** - Vercel will auto-redeploy, or trigger manually
2. **Run Migrations** - See next section
3. **Test** - Visit your site and test login

---

## 🚀 Next: Run Database Migrations

After setting variables, run migrations:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
cd apps/api
pip install -r requirements.txt
alembic upgrade head
```

---

**Ready?** Let me know when you've added the variables and I'll help you test!

