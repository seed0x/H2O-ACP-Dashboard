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

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and deployment overview
- **[Deployment Notes](DEPLOYMENT_NOTES.md)** - Production deployment configuration
- **[Architecture Audit](SENIOR_ENGINEER_AUDIT.md)** - Comprehensive architecture review and recommendations
- **[Critical Fixes](CRITICAL_FIXES_APPLIED.md)** - P0 fixes applied (marketing routes, async patterns, connection pooling)
- **[P1 Improvements](P1_IMPROVEMENTS_APPLIED.md)** - High-priority improvements (API versioning, tenant config, rate limiting, user management)
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing instructions

## Project Structure

```
├── apps/
│   ├── api/               # FastAPI backend (deployed on Render)
│   └── web/               # Next.js frontend (deployed on Vercel)
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

- **Frontend**: Deployed on Vercel (Next.js)
- **API**: Deployed on Render (FastAPI)

See [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md) for detailed deployment configuration and environment variable setup.
