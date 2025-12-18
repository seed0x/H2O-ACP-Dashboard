# 🚀 Quick Start Guide

Get your application running in 5 minutes!

---

## For Production Deployment (Vercel Frontend + Render API)

### 1️⃣ Set Up Database

Choose one:
- **Supabase** (free): https://supabase.com → Create project → Copy connection string
- **Render.com**: Create PostgreSQL → Copy connection string
- **Railway**: Create PostgreSQL → Copy connection string

### 2️⃣ Set Vercel Environment Variables

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these (Production environment):

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname
ADMIN_PASSWORD=your-strong-password-here
JWT_SECRET=generate-with-openssl-rand-hex-32
JWT_ALGORITHM=HS256
ENVIRONMENT=production
CORS_ORIGINS=https://dataflow-eta.vercel.app
```

**Generate JWT_SECRET:**
```bash
# Windows PowerShell:
-join ((48..57) + (65..70) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

# Or use online generator: https://generate-secret.vercel.app/64
```

### 3️⃣ Run Migrations

```bash
# Install Vercel CLI
npm install -g vercel

# Login and link
vercel login
vercel link

# Pull env vars
vercel env pull .env.local

# Run migrations
cd apps/api
pip install -r requirements.txt
alembic upgrade head
```

### 4️⃣ Deploy

```bash
git push
# Vercel auto-deploys!
```

### 5️⃣ Test

- Visit: https://dataflow-eta.vercel.app
- Test API: https://dataflow-eta.vercel.app/api/v1/health
- Login: Use username "admin" and your ADMIN_PASSWORD

---

## For Local Development

### 1️⃣ Create .env File

```bash
# Copy the example
cp .env.example .env

# Or create manually (see .env.example for template)
```

### 2️⃣ Start Services

```bash
make dev
```

### 3️⃣ Run Migrations

```bash
# In new terminal
make migrate
```

### 4️⃣ Access

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Health: http://localhost:8000/api/v1/health

### 5️⃣ Login

- Username: `admin`
- Password: Value from `ADMIN_PASSWORD` in `.env` (default: `adminpassword`)

---

## 🔍 Verify Everything Works

### Check API
```bash
curl http://localhost:8000/api/v1/health
# Should return: {"status":"ok"}
```

### Check Frontend
- Open http://localhost:3000
- Should see dashboard (after login)

### Check Database
```bash
# If using Docker
docker-compose -f infra/docker-compose.yml exec db psql -U postgres -d plumbing -c "\dt"
# Should list all tables
```

---

## ⚠️ Common Issues

**"Database connection failed"**
- Check `DATABASE_URL` is correct
- Ensure database is running (if local)
- For Vercel: Database must be publicly accessible

**"Migration errors"**
- Run: `alembic upgrade head`
- Check database connection first

**"CORS errors"**
- Add your domain to `CORS_ORIGINS`
- Format: `https://dataflow-eta.vercel.app` (no trailing slash)

**"Login not working"**
- Use new format: `{"username": "admin", "password": "..."}`
- Check `ADMIN_PASSWORD` matches

---

## 📚 Next Steps

- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- Read [VERCEL_SERVERLESS_COMPLETE.md](VERCEL_SERVERLESS_COMPLETE.md) for Vercel-specific details
- Read [TESTING_GUIDE.md](TESTING_GUIDE.md) to test all features

---

**Need help?** Check the troubleshooting section in SETUP_GUIDE.md

