# H2O-ACP Dashboard

Multi-tenant plumbing operations platform. Backend: FastAPI + PostgreSQL. Frontend: Next.js + TypeScript.

## Quickstart

```bash
cp .env.example .env
make dev
```

Then:
- Run migrations: `make migrate`
- Seed: `make seed`

## Documentation

- **[Architecture Audit](SENIOR_ENGINEER_AUDIT.md)** - Comprehensive architecture review and recommendations
- **[Critical Fixes](CRITICAL_FIXES_APPLIED.md)** - P0 fixes applied (marketing routes, async patterns, connection pooling)
- **[P1 Improvements](P1_IMPROVEMENTS_APPLIED.md)** - High-priority improvements (API versioning, tenant config, rate limiting, user management)
- **[Vercel Deployment](VERCEL_SERVERLESS_COMPLETE.md)** - Complete guide for deploying to Vercel with serverless functions
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing instructions

## Project Structure

```
├── api/                    # Vercel serverless function handler
├── apps/
│   ├── api/               # FastAPI backend
│   └── web/               # Next.js frontend
├── docs/                  # Project documentation
├── infra/                 # Docker & deployment configs
└── scripts/               # Utility scripts
```

## Features

- ✅ Multi-tenant architecture (all_county, h2o)
- ✅ Jobs, Bids, Service Calls management
- ✅ Marketing content calendar
- ✅ Builder & contact management
- ✅ Comprehensive audit logging
- ✅ User management with RBAC
- ✅ Rate limiting
- ✅ API versioning (`/api/v1`)

## Deployment

See [VERCEL_SERVERLESS_COMPLETE.md](VERCEL_SERVERLESS_COMPLETE.md) for Vercel deployment instructions.
