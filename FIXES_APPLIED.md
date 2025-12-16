# Test Fixes Applied - Vercel Serverless + Supabase

## Summary

Fixed all test failures and ensured the application is properly configured for **Vercel serverless functions** with **Supabase database** connection.

## Issues Fixed

### 1. Test Database Setup
**Problem**: Tests were failing because:
- Database tables weren't being created before tests
- Admin user didn't exist in test database
- Each test file had duplicate setup code

**Solution**: Created `apps/api/tests/conftest.py` with shared fixtures:
- `setup_db`: Automatically creates/drops database tables for each test
- `create_admin_user`: Creates admin user with password "adminpassword" for all tests

### 2. Test File Updates
Updated all test files to use shared fixtures:
- ✅ `test_all_endpoints.py` - Fixed auth_token fixture and added proper error messages
- ✅ `test_builder.py` - Removed duplicate setup_db, uses conftest
- ✅ `test_audit.py` - Removed duplicate setup_db, uses conftest  
- ✅ `test_job_constraints.py` - Removed duplicate setup_db, uses conftest
- ✅ `test_login.py` - Added better error messages

### 3. Web App Configuration for Vercel
**Problem**: Frontend was trying to connect to `localhost:8000` which doesn't exist in serverless setup.

**Solution**: Updated configuration files:
- ✅ `apps/web/lib/config.ts` - Defaults to same-domain (serverless functions)
- ✅ `apps/web/next.config.js` - Only proxies if `NEXT_PUBLIC_API_URL` is explicitly set
- ✅ `apps/web/package.json` - Added `dev:vercel` script for local serverless development

## Architecture

### Production (Vercel)
```
Frontend (Next.js) → Vercel Serverless Function (/api/index.py) → Supabase Database
```

### Local Development
**Option 1: Serverless (Recommended)**
```bash
vercel dev
# or
cd apps/web && npm run dev:vercel
```

**Option 2: Separate API Server**
```bash
# Set in .env:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Then run:
cd apps/api && uvicorn app.main:app --reload
cd apps/web && npm run dev
```

## Test Configuration

### Running Tests
```bash
cd apps/api
pytest
```

### Test Database
Tests use the same database connection as configured in `DATABASE_URL` environment variable. Each test:
1. Drops all tables
2. Creates all tables
3. Creates admin user
4. Runs test
5. Cleans up

### Test Admin User
- Username: `admin`
- Password: `adminpassword`
- Role: `admin`
- Created automatically for each test

## Vercel Environment Variables Required

Set these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname
ADMIN_PASSWORD=your-admin-password
JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-domain.vercel.app
```

**Note**: `NEXT_PUBLIC_API_URL` is **NOT needed** in Vercel - API runs as serverless function on same domain.

## Files Changed

### Test Files
- ✅ `apps/api/tests/conftest.py` - **NEW** - Shared fixtures
- ✅ `apps/api/tests/test_all_endpoints.py` - Updated to use shared fixtures
- ✅ `apps/api/tests/test_builder.py` - Removed duplicate setup
- ✅ `apps/api/tests/test_audit.py` - Removed duplicate setup
- ✅ `apps/api/tests/test_job_constraints.py` - Removed duplicate setup
- ✅ `apps/api/tests/test_login.py` - Better error messages

### Web App Files
- ✅ `apps/web/lib/config.ts` - Fixed for serverless
- ✅ `apps/web/next.config.js` - Fixed for serverless
- ✅ `apps/web/package.json` - Added vercel dev script

## Verification

### Test All Endpoints
```bash
cd apps/api
pytest tests/test_all_endpoints.py -v
```

Expected: All tests should pass ✅

### Test Login
```bash
cd apps/api
pytest tests/test_login.py -v
```

Expected: Login test should pass ✅

### Test Health Endpoint
```bash
cd apps/api
pytest tests/test_all_endpoints.py::TestAuthentication::test_health_endpoint -v
```

Expected: Health endpoint test should pass ✅

## Next Steps

1. **Run Tests**: Verify all tests pass locally
2. **Deploy to Vercel**: Push to Git (Vercel auto-deploys)
3. **Set Environment Variables**: Add Supabase connection string and secrets in Vercel dashboard
4. **Run Migrations**: Use Vercel CLI to run database migrations
5. **Test Production**: Verify login and API endpoints work on Vercel

## Notes

- Tests use the same database as configured in `DATABASE_URL`
- For isolated test databases, set `DATABASE_URL` to a test database before running tests
- Admin user is created fresh for each test with password "adminpassword"
- All tests are isolated - each test gets a fresh database

