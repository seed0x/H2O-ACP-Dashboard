# Project Structure

Clean, organized structure for H2O-ACP Dashboard.

## 📁 Directory Structure

```
H2O-ACP-Dashboard/
├── api/                          # Vercel serverless function
│   ├── index.py                  # FastAPI handler for Vercel
│   └── requirements.txt          # Python dependencies for serverless
│
├── apps/
│   ├── api/                      # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/              # API routes
│   │   │   ├── core/             # Core modules (auth, config, etc.)
│   │   │   ├── db/               # Database session
│   │   │   ├── main.py           # FastAPI app entry point
│   │   │   ├── models.py         # SQLAlchemy models
│   │   │   ├── crud.py           # CRUD operations
│   │   │   ├── routes_marketing.py
│   │   │   └── schemas.py        # Pydantic schemas
│   │   ├── alembic/              # Database migrations
│   │   ├── tests/                # Test files
│   │   ├── requirements.txt      # Python dependencies
│   │   └── Dockerfile            # Docker image for API
│   │
│   └── web/                      # Next.js frontend
│       ├── app/                  # Next.js app directory
│       ├── components/           # React components
│       ├── lib/                  # Utilities (config, etc.)
│       ├── package.json          # Node dependencies
│       └── Dockerfile            # Docker image for web
│
├── docs/                         # Project documentation
│   ├── ARCHITECTURE.md
│   ├── MVP_V1.md
│   ├── MARKETING_MVP_V1.md
│   └── RUNBOOK.md
│
├── infra/                        # Infrastructure configs
│   ├── docker-compose.yml        # Development Docker Compose
│   ├── docker-compose.prod.yml   # Production Docker Compose
│   └── nginx/                    # Nginx configuration
│
├── scripts/                      # Utility scripts
│   ├── backup-db.sh
│   └── start-dev.ps1
│
├── .gitignore                    # Git ignore rules
├── Makefile                      # Development commands
├── vercel.json                   # Vercel deployment config
├── render.yaml                   # Render.com deployment config
├── railway.json                  # Railway deployment config
│
└── Documentation Files:
    ├── README.md                 # Main project README
    ├── SENIOR_ENGINEER_AUDIT.md  # Architecture audit
    ├── CRITICAL_FIXES_APPLIED.md # P0 fixes documentation
    ├── P1_IMPROVEMENTS_APPLIED.md # P1 improvements
    ├── VERCEL_SERVERLESS_COMPLETE.md # Vercel deployment guide
    └── TESTING_GUIDE.md          # Testing instructions
```

## 🎯 Key Files

### Configuration
- `vercel.json` - Vercel serverless function routing
- `render.yaml` - Render.com deployment config
- `railway.json` - Railway deployment config
- `Makefile` - Development commands

### Documentation
- `README.md` - Project overview and quickstart
- `SENIOR_ENGINEER_AUDIT.md` - Architecture review
- `CRITICAL_FIXES_APPLIED.md` - P0 fixes applied
- `P1_IMPROVEMENTS_APPLIED.md` - P1 improvements
- `VERCEL_SERVERLESS_COMPLETE.md` - Vercel deployment guide
- `TESTING_GUIDE.md` - Testing instructions

### Backend
- `apps/api/app/main.py` - FastAPI application
- `apps/api/app/core/` - Core modules (auth, config, tenant, rate limit, password)
- `apps/api/app/api/router.py` - Main API routes
- `apps/api/app/models.py` - Database models
- `apps/api/requirements.txt` - Python dependencies

### Frontend
- `apps/web/app/` - Next.js pages
- `apps/web/components/` - React components
- `apps/web/lib/config.ts` - API configuration

### Serverless
- `api/index.py` - Vercel serverless function handler
- `api/requirements.txt` - Serverless function dependencies

## 📝 Notes

- **Root `requirements.txt`** - Legacy file, use `apps/api/requirements.txt` instead
- **`packages/db/`** - Placeholder directory, currently unused
- All essential documentation is in root directory for easy access

