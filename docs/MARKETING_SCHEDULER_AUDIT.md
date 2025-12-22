# Marketing Scheduler Audit - Step 1

## Current System Map

### Models & Storage

**PostInstance** (`apps/api/app/models.py:239-271`)
- Table: `post_instances`
- Key fields:
  - `tenant_id` (Text, required)
  - `channel_account_id` (UUID, FK to channel_accounts)
  - `content_item_id` (UUID, FK to content_items, required but can be placeholder)
  - `scheduled_for` (DateTime with timezone, nullable)
  - `status` (String, default='Draft') - Valid: 'Draft', 'Scheduled', 'Posted', 'Failed'
  - **Note**: Need to add 'Planned' status for empty slots

**ChannelAccount** (`apps/api/app/models.py:193-212`)
- Table: `channel_accounts`
- Key fields:
  - `tenant_id` (Text, required)
  - `status` (String, default='active') - Already exists for filtering active accounts
  - **Missing**: Scheduling configuration (posts_per_week, days_of_week, times_local, timezone)

**ContentItem** (`apps/api/app/models.py:214-237`)
- Table: `content_items`
- Used for actual post content
- **Note**: PostInstances can exist without ContentItems (we'll create placeholder ContentItem for PLANNED slots)

### API Endpoints

**Calendar Endpoint** (`apps/api/app/api/marketing.py:560-591`)
- Route: `GET /api/v1/marketing/calendar`
- Params: `tenant_id` (Query, required), `start_date`, `end_date` (optional)
- Returns: Dict with date keys, PostInstance arrays as values
- Uses: `PostInstance.scheduled_for` to filter and group

**Bulk Post Instance Creation** (`apps/api/app/api/marketing.py:377-424`)
- Route: `POST /api/v1/marketing/post-instances/bulk`
- Params: `tenant_id` (Query, required)
- Body: `CreatePostInstancesRequest` (content_item_id, channel_account_ids[], scheduled_for)
- Creates multiple PostInstances for a ContentItem

**Channel Accounts List** (`apps/api/app/api/marketing.py:85-97`)
- Route: `GET /api/v1/marketing/channel-accounts`
- Params: `tenant_id` (Query, required)
- Returns: List of ChannelAccount for tenant

### Tenant Resolution

**Pattern**: Query parameter (`tenant_id: str = Query(...)`)
- All marketing endpoints use `tenant_id` as query parameter
- JWT token contains `tenant_id` in `CurrentUser` but marketing routes use query param
- Frontend passes `tenant_id=h2o` or `tenant_id=all_county` in URLs

**Auth**: `get_current_user` dependency (`apps/api/app/core/auth.py:31-76`)
- Extracts tenant_id from JWT token payload or User model
- Returns `CurrentUser` with `tenant_id` field
- Marketing routes require auth but use query param for tenant filtering

### Database Migrations

**Location**: `apps/api/alembic/versions/`
- Latest: `0014_add_portals_directory.py`
- PostInstances migration: `0012_add_content_items_and_post_instances.py`
- Uses Alembic with PostgreSQL UUID, ARRAY, DateTime(timezone=True)

### Background Jobs

**Scheduler System** (`apps/api/app/core/scheduler.py`)
- Uses APScheduler (AsyncIOScheduler)
- Started in `main.py` lifespan (line 84-124)
- Existing jobs: check_overdue_items, automate_review_requests, escalate_stale_items, daily_summary
- **Pattern**: Add job to scheduler in main.py startup

### Frontend Integration

**Calendar View** (`apps/web/app/marketing/page.tsx:736-1261`)
- Reads from `/api/v1/marketing/calendar?tenant_id=h2o&start_date=...&end_date=...`
- Displays PostInstances grouped by date
- Shows status badges
- **Note**: Will automatically show PLANNED slots once they exist

**API Base URL** (`apps/web/lib/config.ts`)
- Uses `API_BASE_URL` from environment
- Pattern: `${API_BASE_URL}/marketing/...`

## Implementation Plan Summary

1. **Add 'Planned' status** to PostInstance status enum (schema + model validation)
2. **Add scheduling fields** to ChannelAccount model (minimal: posts_per_week, timezone)
3. **Create migration** for ChannelAccount fields + unique constraint on PostInstance
4. **Create scheduler endpoint** at `/api/v1/marketing/scheduler/topoff`
5. **Add scheduler job** to main.py startup
6. **Update UI** to show PLANNED status and add "Top off" button

## File Paths Reference

- Models: `apps/api/app/models.py`
- Marketing API: `apps/api/app/api/marketing.py`
- Marketing Schemas: `apps/api/app/schemas_marketing.py`
- Migrations: `apps/api/alembic/versions/`
- Main App: `apps/api/app/main.py`
- Scheduler: `apps/api/app/core/scheduler.py`
- Frontend Calendar: `apps/web/app/marketing/page.tsx`
- Router: `apps/api/app/api/router.py` (includes marketing router)

