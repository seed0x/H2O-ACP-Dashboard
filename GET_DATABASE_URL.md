# How to Get Your Supabase DATABASE_URL

## Quick Method

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Settings** → **Database**
4. **Connection string** section → **URI** tab
5. **Copy the connection string**

## Convert to AsyncPG Format

Supabase gives you:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Change to:**
```
postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**OR use direct connection (port 5432):**
```
postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## From Your Variables

Based on what you have:
- User: `postgres`
- Password: `bHkyLwIrYYW4F5dE`

You still need the **host** from Supabase dashboard.

**Format will be:**
```
postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@[SUPABASE-HOST]:5432/postgres
```

Replace `[SUPABASE-HOST]` with the host from Supabase connection string.

