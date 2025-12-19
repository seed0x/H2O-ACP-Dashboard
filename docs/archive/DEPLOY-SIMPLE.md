# Deploy to Vercel + Supabase (100% Free)

## 1. Create Supabase Database (2 min)

1. Go to https://supabase.com/dashboard
2. Create account (free, no card)
3. Click "New Project"
4. Copy the **Connection String** (Postgres URL)

## 2. Deploy to Vercel (3 min)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your GitHub repo
4. Add environment variables:
   - `DATABASE_URL`: (your Supabase connection string)
   - `ADMIN_PASSWORD`: (your password)
   - `JWT_SECRET`: (random 64 chars)
   - `CORS_ORIGINS`: https://your-app.vercel.app
5. Deploy

## 3. Run Database Migration

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration
vercel env pull .env.local
cd apps/api
alembic upgrade head
```

Done. Your app is live at `https://your-app.vercel.app`

**Cost: $0/month forever** (until you hit 100k requests/month)
