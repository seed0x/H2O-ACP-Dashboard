# Architecture

## Overview

H2O-ACP Dashboard is a multi-tenant plumbing operations platform with a separated frontend and backend architecture.

## Deployment Architecture

### Production

- **Frontend**: Deployed on Vercel (`https://dataflow-eta.vercel.app`)
  - Next.js 14 with App Router
  - Static assets served via CDN
  - Edge functions for optimal performance

- **API**: Deployed on Render (`https://h2o-acp-dashboard.onrender.com`)
  - FastAPI application
  - PostgreSQL database (Supabase)
  - Long-running processes (background jobs, schedulers)
  - Better suited for database connections and async operations

### Why This Architecture?

1. **Vercel** is optimized for Next.js frontends (CDN, edge functions, automatic scaling)
2. **Render** is better for FastAPI backends (long-running processes, database connections, background jobs)
3. **Separation of concerns**: Each service optimized for its purpose
4. **Reliability**: Avoids Vercel Python runtime compatibility issues

### Communication Flow

```
Browser → Vercel (Frontend) → Render (API) → PostgreSQL (Supabase)
```

The frontend makes HTTP requests directly to the Render API. CORS is configured on Render to allow requests from the Vercel domain.

## Application Architecture

### Data Layer

- **PostgreSQL** is the single source of truth
- **Alembic** handles database migrations
- **SQLAlchemy** (async) for ORM

### API Layer

- **FastAPI** application
- Implements validation, business rules, and access control
- API versioning: `/api/v1/*`
- JWT authentication with httpOnly cookies + localStorage fallback
- Multi-tenant architecture (all_county, h2o)
- Rate limiting
- Comprehensive audit logging

### Frontend Layer

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **React** components
- Communicates with API via JWT auth
- Client-side routing and state management

## Data Model

### Shared Tables
- `builders` - Builder information (shared across tenants)
- `builder_contacts` - Builder contacts (shared across tenants)

### Tenant-Scoped Tables
All tenant-scoped tables contain `tenant_id` filter:
- `bids` - Bid management
- `jobs` - Job management
- `service_calls` - Service call management
- `review_requests` - Review request management
- `reviews` - Customer reviews
- `recovery_tickets` - Recovery ticket management
- `marketing_channels` - Marketing channel definitions
- `channel_accounts` - Marketing channel accounts
- `content_items` - Marketing content items
- `post_instances` - Post instances
- `publish_jobs` - Publishing jobs

### Audit Log
- `audit_logs` - Captures all create/update/delete operations with:
  - Entity type and ID
  - Action performed
  - Changed fields (old/new values)
  - User who made the change
  - Timestamp

## Environment Configuration

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` (optional) - Explicitly set API URL
- If not set, automatically uses Render API in production

### Backend (Render)
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_PASSWORD` - Admin user password
- `JWT_SECRET` - JWT signing secret
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `CORS_ORIGINS` - Allowed frontend origins (comma-separated)
- `ENVIRONMENT` - Environment name (production/development)

## Development

### Local Development
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Database: Local PostgreSQL or Docker container

### Docker Development
- `docker-compose.yml` for local development
- All services run in containers
- Database migrations run automatically

## Future Considerations

When adding new features:

1. **API Routes**: Add to `apps/api/app/api/router.py` or create new router files
2. **Frontend Pages**: Add to `apps/web/app/` directory
3. **Database Changes**: Create Alembic migration in `apps/api/alembic/versions/`
4. **CORS**: Update `CORS_ORIGINS` on Render if adding new frontend domains
5. **Environment Variables**: Document new variables in `DEPLOYMENT_NOTES.md`

## Deployment Notes

See [DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md) for detailed deployment configuration and environment variable setup.
