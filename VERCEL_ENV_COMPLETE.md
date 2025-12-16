# ✅ Complete Vercel Environment Variables Setup

## 🎯 Exact Values to Add

Based on your Supabase project URL: `https://woxkbgzttghqwfilahfe.supabase.co`

### Add These 4 Variables to Vercel (Production Environment)

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

#### 1. DATABASE_URL
```
DATABASE_URL = postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres
```

#### 2. ENVIRONMENT
```
ENVIRONMENT = production
```

#### 3. CORS_ORIGINS
```
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

#### 4. JWT_ALGORITHM
```
JWT_ALGORITHM = HS256
```

---

## 📋 Complete Variable List (What You Should Have)

### Required Backend Variables
```
DATABASE_URL = postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres
ADMIN_PASSWORD = change-this-to-your-secure-password
JWT_SECRET = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
JWT_ALGORITHM = HS256
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

### Optional (Can Keep - Won't Hurt)
```
Database_SUPABASE_URL = https://woxkbgzttghqwfilahfe.supabase.co
NEXT_PUBLIC_Database_SUPABASE_URL = https://woxkbgzttghqwfilahfe.supabase.co
Database_SUPABASE_PUBLISHABLE_KEY = sb_publishable_OvoUZtrbq7__3NWPpCQ5LQ_fWJ-dsBc
NEXT_PUBLIC_Database_SUPABASE_PUBLISHABLE_KEY = sb_publishable_OvoUZtrbq7__3NWPpCQ5LQ_fWJ-dsBc
Database_SUPABASE_JWT_SECRET = yKeSGqiNxVirn3mwUuHLC6sngMlGNnBfIla6oUXAIm+qdTBMwy83TmGnZarUo/gfKV4f/jhihNN1lg17UqXQiA==
Database_POSTGRES_USER = postgres
Database_POSTGRES_PASSWORD = bHkyLwIrYYW4F5dE
Database_SUPABASE_SECRET_KEY = sb_secret_3Mc4zO1ciI1T8oS-pnHoMw_lrdLN63o
```

---

## ⚠️ IMPORTANT: Update ADMIN_PASSWORD

**Change this immediately:**
```
ADMIN_PASSWORD = change-this-to-your-secure-password
```

**To a strong password like:**
```
ADMIN_PASSWORD = YourStrongPassword123!@#
```

---

## ✅ Next Steps

### 1. Add Variables to Vercel
- Copy the 4 variables above
- Add them in Vercel Dashboard → Settings → Environment Variables
- Make sure to select **Production** environment

### 2. Update ADMIN_PASSWORD
- Change it to a real strong password

### 3. Run Database Migrations

After variables are set, run migrations:

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Install dependencies
cd apps/api
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

### 4. Test Your Deployment

1. **API Health Check:**
   ```
   https://dataflow-eta.vercel.app/api/v1/health
   ```
   Should return: `{"status":"ok"}`

2. **Test Login:**
   - Visit: https://dataflow-eta.vercel.app/login
   - Username: `admin` (or create user via API)
   - Password: Your `ADMIN_PASSWORD`

---

## 🧪 Quick Test Commands

After deployment, test these endpoints:

```bash
# Health check
curl https://dataflow-eta.vercel.app/api/v1/health

# Should return: {"status":"ok"}

# Test login (replace with your password)
curl -X POST https://dataflow-eta.vercel.app/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-admin-password"}'
```

---

## ✅ Checklist

- [ ] Added `DATABASE_URL` to Vercel
- [ ] Added `ENVIRONMENT = production` to Vercel
- [ ] Added `CORS_ORIGINS` to Vercel
- [ ] Added `JWT_ALGORITHM = HS256` to Vercel
- [ ] Updated `ADMIN_PASSWORD` to a strong password
- [ ] Ran database migrations
- [ ] Tested API health endpoint
- [ ] Tested login functionality

---

**You're all set!** Add those 4 variables and update your admin password, then run migrations.

