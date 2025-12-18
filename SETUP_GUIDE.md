# Complete Setup Guide - H2O-ACP Dashboard

Step-by-step guide to get your application running with all environment variables configured.

---

## 🎯 Overview

You have **two deployment options**:
1. **Production** - Frontend on Vercel, API on Render
2. **Local Development** - Docker Compose setup

---

## Option 1: Production Deployment (Vercel + Render)

### Step 1: Set Up Database

You need a PostgreSQL database. Options:

#### Option A: Supabase (Free, Recommended)
1. Go to https://supabase.com
2. Create account (free tier)
3. Create new project
4. Go to **Settings** → **Database**
5. Copy the **Connection String** (URI format)

#### Option B: Render.com PostgreSQL
1. Go to https://render.com
2. Create PostgreSQL database
3. Copy connection string

#### Option C: Railway PostgreSQL
1. Go to https://railway.app
2. Create PostgreSQL database
3. Copy connection string

**Connection String Format:**
```
postgresql+asyncpg://user:password@host:port/dbname
```

### Step 2: Generate Secure Values

Run these commands to generate secure values:

```bash
# Generate JWT Secret (64 characters)
python -c "import secrets; print(secrets.token_hex(32))"

# Or on Windows PowerShell:
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Generate Admin Password (you can also just make one up, but make it strong)
# Example: Use a password manager or create a strong password
```

### Step 3: Configure Vercel Environment Variables

1. Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

2. Add these variables (for **Production** environment):

```
DATABASE_URL = postgresql+asyncpg://user:password@host:port/dbname
ADMIN_PASSWORD = your-strong-admin-password
JWT_SECRET = your-64-character-hex-secret
JWT_ALGITHM = HS256
ENVIRONMENT = production
CORS_ORIGINS = https://dataflow-eta.vercel.app
```

**Important Notes:**
- Replace `DATABASE_URL` with your actual database connection string
- `ADMIN_PASSWORD` - Use a strong password (this is for legacy admin login)
- `JWT_SECRET` - Must be at least 32 characters (64 hex characters recommended)
- `CORS_ORIGINS` - Your Vercel domain (already set to your domain)

### Step 4: Run Database Migrations

After setting environment variables, run migrations:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables locally
vercel env pull .env.local

# Run migrations (you'll need Python and dependencies)
cd apps/api
pip install -r requirements.txt
alembic upgrade head
```

**OR** use Vercel's built-in migration runner (if available).

### Step 5: Deploy

```bash
# Push to Git (Vercel auto-deploys)
git add .
git commit -m "Setup complete"
git push

# OR manually deploy
vercel --prod
```

### Step 6: Verify Deployment

1. Visit: `https://dataflow-eta.vercel.app`
2. Test API: `https://dataflow-eta.vercel.app/api/v1/health`
3. Should return: `{"status":"ok"}`

---

## Option 2: Local Development Setup

### Step 1: Create Environment File

Create `.env` file in project root:

```bash
# Copy example (if exists) or create new
# Windows PowerShell:
Copy-Item .env.example .env
# Or create manually
```

### Step 2: Configure .env File

Create/update `.env` file with these values:

```env
# Database (Docker Compose uses these defaults)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/plumbing

# Admin Password (for legacy login)
ADMIN_PASSWORD=adminpassword

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# CORS (for local development)
CORS_ORIGINS=http://localhost:3000

# Frontend API URL (for local dev)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Start Services

```bash
# Start all services (database, API, frontend)
make dev

# OR manually:
docker-compose -f infra/docker-compose.yml up --build
```

### Step 4: Run Migrations

In a new terminal:

```bash
# Run migrations
make migrate

# OR manually:
docker-compose -f infra/docker-compose.yml run --rm api alembic upgrade head
```

### Step 5: Seed Database (Optional)

```bash
# Seed with sample data
make seed

# OR manually:
docker-compose -f infra/docker-compose.yml run --rm api python -m app.seed
```

### Step 6: Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Health**: http://localhost:8000/api/v1/health
- **API Docs**: http://localhost:8000/docs (if enabled)

---

## 🔐 Environment Variables Reference

### Backend API Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | `postgresql+asyncpg://postgres:postgres@db:5432/plumbing` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | ✅ Yes | `adminpassword` | Legacy admin login password |
| `JWT_SECRET` | ✅ Yes | `changemeplease` | Secret key for JWT tokens (64+ chars recommended) |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `API_HOST` | No | `0.0.0.0` | API server host |
| `API_PORT` | No | `8000` | API server port |
| `ENVIRONMENT` | No | `development` | Environment (development/production) |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated list of allowed origins |

### Frontend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No* | `http://localhost:8000` | Backend API URL (not needed in Vercel) |

*Not needed in Vercel production (API runs as serverless function)

---

## ✅ Verification Checklist

### Local Development
- [ ] `.env` file created with all variables
- [ ] Docker services start without errors
- [ ] Database migrations run successfully
- [ ] API health check returns `{"status":"ok"}`
- [ ] Frontend loads at http://localhost:3000
- [ ] Can login with admin password

### Vercel Production
- [ ] All environment variables set in Vercel dashboard
- [ ] Database connection string is correct
- [ ] Database migrations run successfully
- [ ] Frontend deploys without errors
- [ ] API health check works: `https://dataflow-eta.vercel.app/api/v1/health`
- [ ] Can login with admin credentials

---

## 🐛 Troubleshooting

### Issue: Database Connection Failed
**Solution:**
- Check `DATABASE_URL` format is correct
- Ensure database is accessible from Vercel (not localhost)
- Verify database credentials

### Issue: Migration Errors
**Solution:**
```bash
# Check current migration status
alembic current

# Upgrade to latest
alembic upgrade head

# If stuck, check database connection
```

### Issue: CORS Errors
**Solution:**
- Add your domain to `CORS_ORIGINS` in backend
- Format: `https://dataflow-eta.vercel.app` (no trailing slash)

### Issue: Login Not Working
**Solution:**
- Check `ADMIN_PASSWORD` is set correctly
- Try new login format: `{"username": "admin", "password": "your-password"}`
- Check browser console for errors

---

## 🚀 Quick Start Commands

### Local Development
```bash
# 1. Create .env file (see above)
# 2. Start services
make dev

# 3. Run migrations (in new terminal)
make migrate

# 4. Seed database (optional)
make seed
```

### Vercel Deployment
```bash
# 1. Set environment variables in Vercel dashboard
# 2. Push to Git
git push

# 3. Run migrations (one-time)
vercel env pull .env.local
cd apps/api
alembic upgrade head
```

---

**Ready to start?** Follow the steps above for your chosen deployment method!

