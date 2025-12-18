# Architecture Changelog

## December 2024 - Architecture Separation

### Change Summary
Separated frontend and backend deployments to fix Vercel Python runtime compatibility issues.

### Previous Architecture
- Frontend: Vercel (Next.js)
- API: Vercel (Python serverless functions)
- **Problem**: Vercel Python runtime had compatibility issues with FastAPI ASGI format, causing persistent `TypeError: issubclass() arg 1 must be a class` errors

### Current Architecture
- **Frontend**: Vercel (`https://dataflow-eta.vercel.app`)
  - Next.js 14 with App Router
  - Optimized for static assets and edge functions
  
- **API**: Render (`https://h2o-acp-dashboard.onrender.com`)
  - FastAPI application
  - Better suited for long-running processes, database connections, and background jobs

### Benefits
1. **Reliability**: Render API is proven to work without runtime issues
2. **Performance**: Each service optimized for its purpose
3. **Simplicity**: No more fighting with Vercel's Python runtime
4. **Scalability**: Independent scaling for frontend and backend

### Files Changed
- `vercel.json` - Removed Python build configuration
- `apps/web/lib/config.ts` - Updated to use Render API in production
- `apps/web/next.config.js` - Simplified rewrites
- `api/index.py` - **DELETED** (no longer needed)
- `api/requirements.txt` - **DEPRECATED** (marked as deprecated)

### Documentation Updated
- `docs/ARCHITECTURE.md` - Complete architecture overview
- `DEPLOYMENT_NOTES.md` - Deployment configuration guide
- `README.md` - Updated project structure and deployment info
- `PROJECT_STRUCTURE.md` - Removed references to serverless functions
- `VERCEL_SERVERLESS_COMPLETE.md` - Marked as deprecated

### Migration Notes
- CORS must be configured on Render to allow Vercel domain
- Environment variables moved to Render (API) and Vercel (Frontend)
- No code changes needed in application logic

### For Future Development
When adding new features:
1. API routes go in `apps/api/app/api/` or new router files
2. Frontend pages go in `apps/web/app/`
3. Database migrations in `apps/api/alembic/versions/`
4. Update `CORS_ORIGINS` on Render if adding new frontend domains
5. Document new environment variables in `DEPLOYMENT_NOTES.md`

