# 🚀 Vercel Environment Variables - Quick Setup

## ✅ What You Already Have

From your Vercel dashboard:
- ✅ `ADMIN_PASSWORD` = change-this-to-your-secure-password
- ✅ `JWT_SECRET` = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
- ✅ Supabase credentials

## ❌ What You Need to Add

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these **4 variables** (for **Production** environment):

### 1. DATABASE_URL

**You need to get this from Supabase:**

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click **URI** tab
6. Copy the connection string

**It will look like:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**OR:**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**Convert to AsyncPG format** (change `postgresql://` to `postgresql+asyncpg://`):

```
postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**From your variables, you have:**
- Password: `bHkyLwIrYYW4F5dE`
- User: `postgres`

**So your DATABASE_URL will be:**
```
postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[SUPABASE-HOST]:5432/postgres
```

**Replace `[SUPABASE-HOST]`** with the host from Supabase (e.g., `db.xxxxx.supabase.co`)

### 2. ENVIRONMENT

```
ENVIRONMENT = production
```

### 3. CORS_ORIGINS

```
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

### 4. JWT_ALGORITHM (Optional but recommended)

```
JWT_ALGORITHM = HS256
```

---

## 📋 Complete Variable List

Here's everything you should have in Vercel (Production):

```
DATABASE_URL = postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[SUPABASE-HOST]:5432/postgres
ADMIN_PASSWORD = change-this-to-your-secure-password
JWT_SECRET = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
JWT_ALGORITHM = HS256
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

**Keep your Supabase variables** (they won't hurt, but aren't needed for the API):
- Database_SUPABASE_JWT_SECRET
- Database_POSTGRES_USER
- Database_POSTGRES_PASSWORD
- NEXT_PUBLIC_Database_SUPABASE_PUBLISHABLE_KEY
- Database_SUPABASE_SECRET_KEY

---

## ⚠️ Important: Update ADMIN_PASSWORD

**Change `ADMIN_PASSWORD` from `change-this-to-your-secure-password` to a real strong password!**

---

## ✅ After Adding Variables

1. **Vercel will auto-redeploy** (or trigger manually)
2. **Run database migrations** (see next section)
3. **Test your site**: https://dataflow-eta.vercel.app

---

## 🗄️ Run Database Migrations

After setting variables, you need to run migrations:

### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Install Python dependencies
cd apps/api
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

### Option 2: Direct Database Connection

If you have direct database access, connect and run:

```bash
# Set DATABASE_URL in your local environment
export DATABASE_URL="postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[HOST]:5432/postgres"

# Run migrations
cd apps/api
pip install -r requirements.txt
alembic upgrade head
```

---

## 🧪 Test Your Setup

After migrations:

1. **Test API Health:**
   ```
   https://dataflow-eta.vercel.app/api/v1/health
   ```
   Should return: `{"status":"ok"}`

2. **Test Login:**
   - Go to: https://dataflow-eta.vercel.app/login
   - Use username: `admin` (or create a user)
   - Use password: Your `ADMIN_PASSWORD`

---

## 🆘 Need Help?

**Can't find Supabase host?**
- Go to Supabase Dashboard → Settings → Database
- Look for "Connection string" → "URI" tab
- The host is the part after `@` and before `:`

**Example:**
```
postgresql://postgres:password@db.abcdefghijklmnop.supabase.co:5432/postgres
                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                    This is your host
```

---

**Ready?** Add those 4 variables and let me know when done!

