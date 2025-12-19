# H2O-ACP Dashboard

Multi-tenant plumbing operations platform for **H2O Plumbing** (service/warranty) and **All County Construction** (new construction).

**Tech Stack**: FastAPI + PostgreSQL + Next.js + TypeScript

## 🚀 Quick Start

```bash
# Clone and setup
cp .env.example .env
make dev

# Run migrations
make migrate

# Seed data
make seed
```

For detailed setup instructions, see **[QUICK_START.md](QUICK_START.md)**

## 📚 Documentation

### Core Guides
- **[Quick Start Guide](QUICK_START.md)** - Get up and running locally
- **[Testing Guide](TESTING_GUIDE.md)** - Run tests and verify functionality
- **[Deployment Options](DEPLOYMENT_OPTIONS.md)** - Deploy to production

### Architecture & Design
- **[Application Overview](APPLICATION_OVERVIEW.md)** - System architecture and design
- **[Project Structure](PROJECT_STRUCTURE.md)** - Codebase organization

### Maintenance
- **[Known Issues](FAILURE_MAP.md)** - Active bugs and workarounds
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Latest UX/UI improvements

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
