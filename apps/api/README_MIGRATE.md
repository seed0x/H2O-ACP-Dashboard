# One-Time Data Migration

## Quick Start

1. **Set your Supabase DATABASE_URL:**
   ```powershell
   $env:DATABASE_URL = "postgresql+asyncpg://user:password@host:port/dbname"
   ```
   
   Get connection string from: Supabase Dashboard > Settings > Database > Connection String (URI format)

2. **Run migration:**
   ```bash
   cd apps/api
   py migrate_once.py
   ```
   
   Or double-click `migrate.bat`

## What It Does

- Reads `DATA/all county jobs.CSV` → imports to `all_county` tenant
- Reads `DATA/H2o_Service Calendar.ics` → imports to `h2o` tenant
- Automatically creates builders if they don't exist
- Skips duplicate jobs automatically
- Shows progress and summary

## Files Required

- `DATA/all county jobs.CSV` - Your All County calendar export
- `DATA/H2o_Service Calendar.ics` - Your H2O Service calendar export

## That's It

Run once, get all your historical data in the database. Done.

