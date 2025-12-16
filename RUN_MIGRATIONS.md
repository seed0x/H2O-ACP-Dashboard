# How to Run Database Migrations

## 🎯 Quick Start

You have **7 migrations** to run. Here are the options:

---

## Option 1: Run Migrations Locally (Recommended for First Time)

This is the easiest way to run migrations before deploying.

### Step 1: Get Environment Variables from Vercel

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Pull environment variables to .env.local
vercel env pull .env.local
```

### Step 2: Set Up Python Environment

```bash
# Navigate to API directory
cd apps/api

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Set DATABASE_URL

Make sure `DATABASE_URL` is set. From your `.env.local` file (created in Step 1):

```bash
# Windows PowerShell:
$env:DATABASE_URL="postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"

# Or add to .env.local file and source it
```

### Step 4: Run Migrations

```bash
# Make sure you're in apps/api directory
cd apps/api

# Run all pending migrations
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Running upgrade -> 0001, create_tables
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add_warranty_tracking
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, add_marketing_module
...
INFO  [alembic.runtime.migration] Running upgrade 0006 -> 0007, add_user_management
```

---

## Option 2: Run Migrations via Vercel CLI

You can run migrations directly using Vercel's environment:

```bash
# Pull environment variables
vercel env pull .env.local

# Set DATABASE_URL from .env.local
# Windows PowerShell:
Get-Content .env.local | ForEach-Object { if ($_ -match '^DATABASE_URL=(.+)$') { [Environment]::SetEnvironmentVariable('DATABASE_URL', $matches[1], 'Process') } }

# Or manually set:
$env:DATABASE_URL="postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"

# Navigate to API directory
cd apps/api

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

---

## Option 3: Run Migrations in Docker (If Using Docker)

If you're using Docker locally:

```bash
# From project root
docker-compose -f infra/docker-compose.yml run --rm api alembic upgrade head
```

---

## Option 4: Manual SQL (Not Recommended)

If migrations fail, you can manually run SQL, but this is **not recommended**. Use migrations instead.

---

## ✅ Verify Migrations Ran Successfully

### Check Migration Status

```bash
cd apps/api
alembic current
```

**Should show:**
```
0007_add_user_management (head)
```

### Check Database Tables

Connect to your Supabase database and verify these tables exist:
- `users` (from migration 0007)
- `jobs`
- `bids`
- `service_calls`
- `builders`
- `marketing_channels`
- `marketing_campaigns`
- `audit_logs`

---

## 🐛 Troubleshooting

### Error: "Can't locate revision identified by..."

**Solution:**
```bash
# Check current revision
alembic current

# If stuck, you can stamp the database
alembic stamp head
```

### Error: "DATABASE_URL not set"

**Solution:**
```bash
# Windows PowerShell:
$env:DATABASE_URL="postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"

# Verify it's set:
echo $env:DATABASE_URL
```

### Error: "Module not found"

**Solution:**
```bash
# Make sure you're in apps/api directory
cd apps/api

# Install dependencies
pip install -r requirements.txt
```

### Error: "Connection refused" or "Can't connect to database"

**Solution:**
- Check your `DATABASE_URL` is correct
- Verify Supabase database is running
- Check firewall/network settings
- Try using Supabase connection pooler URL instead

---

## 📋 Migration Files You Have

1. `0001_create_tables.py` - Creates initial tables
2. `0002_add_warranty_tracking.py` - Adds warranty tracking
3. `0003_add_marketing_module.py` - Adds marketing tables
4. `0004_seed_marketing_channels.py` - Seeds marketing channels
5. `0005_add_draft_due_date.py` - Adds draft due date
6. `0006_fix_multi_channel_support.py` - Fixes multi-channel support
7. `0007_add_user_management.py` - Adds user management (NEW)

---

## 🚀 Quick Command Reference

```bash
# Run all migrations
alembic upgrade head

# Check current migration
alembic current

# See migration history
alembic history

# Rollback one migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade 0006

# Create new migration (for future use)
alembic revision --autogenerate -m "description"
```

---

## ✅ After Running Migrations

1. **Verify tables exist** in Supabase dashboard
2. **Test API endpoints** - They should work now
3. **Create a user** via API or seed script
4. **Test login** functionality

---

**Ready to run?** Use **Option 1** (local) for the first time - it's the most reliable!

