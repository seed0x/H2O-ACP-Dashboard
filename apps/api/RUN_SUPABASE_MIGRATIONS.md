# Running Migrations and Creating Users in Supabase

## Step 1: Set Your Supabase Database URL

Open PowerShell in the project root and set the environment variable:

```powershell
$env:DATABASE_URL = "postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"
```

**Or create a `.env` file in `apps/api/` folder:**
```
DATABASE_URL=postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres
ADMIN_PASSWORD=your-secure-password-here
```

## Step 2: Navigate to API Directory

```powershell
cd apps/api
```

## Step 3: Run Database Migrations

This will create all the tables (users, builders, jobs, bids, etc.):

```powershell
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Running upgrade -> 0001, create tables
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add warranty tracking
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, add marketing module
...
INFO  [alembic.runtime.migration] Running upgrade 0007 -> 0008, add tech name to jobs
```

## Step 4: Create Admin User

Set the admin password (if not already set):

```powershell
$env:ADMIN_PASSWORD = "your-secure-password-here"
```

Then run the admin user creation script:

```powershell
python fix_admin.py
```

**Expected output:**
```
Admin user not found, creating new one...
[OK] Admin user fixed!
   Username: admin
   Password: your-secure-password-here
   (from ADMIN_PASSWORD env var)
```

## Alternative: Using .env File

Create `apps/api/.env` file:

```env
DATABASE_URL=postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres
ADMIN_PASSWORD=your-secure-password-here
```

Then run:
```powershell
cd apps/api
alembic upgrade head
python fix_admin.py
```

## Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor**
4. You should see tables:
   - `users` (with your admin user)
   - `builders`
   - `jobs`
   - `bids`
   - `service_calls`
   - `alembic_version` (tracks migration state)
   - etc.

## Troubleshooting

### "relation does not exist" error
- Make sure you ran `alembic upgrade head` first
- Check that `DATABASE_URL` is set correctly

### "Admin user already exists"
- That's fine! The script will update the password if the user exists
- You can still log in with the password from `ADMIN_PASSWORD`

### Connection errors
- Verify your Supabase connection string is correct
- Check that your IP is allowed in Supabase (Settings → Database → Connection Pooling)

## What Gets Created

### Tables Created:
- `users` - User accounts
- `builders` - Builder companies
- `builder_contacts` - Contacts for builders
- `jobs` - Job records
- `service_calls` - Service call records
- `bids` - Bid records
- `bid_line_items` - Line items for bids
- `marketing_channels` - Marketing channels
- `marketing_posts` - Marketing posts
- `audit_logs` - Audit trail
- `alembic_version` - Migration tracking

### Admin User:
- Username: `admin`
- Password: Value from `ADMIN_PASSWORD` environment variable
- Role: `admin`
- Email: `admin@example.com`


