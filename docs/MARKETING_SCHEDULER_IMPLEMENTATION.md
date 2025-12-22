# Marketing Scheduler Implementation

## Architecture: How Scheduling Works

The marketing scheduler automatically generates "planned slots" (PostInstances with status='Planned') for active ChannelAccounts. These slots appear in the calendar and can be filled with content later by humans or AI.

### Flow

1. **Background Job** (daily at 2 AM): Calls `topoff_marketing_slots()` which processes all tenants
2. **Manual Trigger**: Users can click "Top off 28 days" button to generate slots immediately
3. **For each active ChannelAccount**:
   - Reads schedule config: `posts_per_week`, `schedule_timezone`, `schedule_times`
   - Computes target datetimes evenly distributed across the rolling horizon (default 28 days)
   - Creates PostInstances with:
     - `status='Planned'`
     - `content_item_id` pointing to placeholder ContentItem `[PLANNED SLOT]`
     - `scheduled_for` set to computed datetime
4. **Idempotency**: Unique constraint on `(tenant_id, channel_account_id, scheduled_for)` prevents duplicates
5. **Safety**: Only creates missing slots; never overwrites existing content or instances beyond Planned/Draft status

### Placeholder ContentItem

A special ContentItem with title `[PLANNED SLOT]` is created per tenant and reused for all planned slots. This satisfies the foreign key requirement while clearly marking slots as empty.

## Files Changed

### Backend

1. **`apps/api/app/models.py`**
   - Added `posts_per_week`, `schedule_timezone`, `schedule_times` fields to `ChannelAccount` model

2. **`apps/api/app/schemas_marketing.py`**
   - Added scheduling fields to `ChannelAccountBase` and `ChannelAccountUpdate`
   - Added 'Planned' to PostInstance status validator

3. **`apps/api/alembic/versions/0015_add_marketing_scheduler.py`** (NEW)
   - Migration: Adds scheduling fields to `channel_accounts`
   - Migration: Adds unique constraint on `post_instances(tenant_id, channel_account_id, scheduled_for)`
   - Removes existing duplicates before adding constraint

4. **`apps/api/app/api/marketing_scheduler.py`** (NEW)
   - New router with `/marketing/scheduler/topoff` endpoint
   - Core logic: `topoff_scheduler_logic()` - can be called from endpoint or background job
   - Helper: `get_or_create_placeholder_content_item()` - manages placeholder ContentItem
   - Helper: `compute_schedule_datetimes()` - calculates target datetimes based on schedule config

5. **`apps/api/app/api/router.py`**
   - Imports and includes `marketing_scheduler_router`

6. **`apps/api/app/core/tasks.py`**
   - Added `topoff_marketing_slots()` background task function
   - Processes all tenants, calls scheduler logic for each

7. **`apps/api/app/main.py`**
   - Added scheduler job: `topoff_marketing_slots` runs daily at 2 AM

8. **`apps/api/requirements.txt`**
   - Added `pytz` and `python-dateutil` dependencies

### Frontend

9. **`apps/web/app/marketing/page.tsx`**
   - Added 'Planned' status color (purple) to `getStatusColor()`
   - Added `topoffLoading` state
   - Added `handleTopoff()` function to call scheduler endpoint
   - Added "📅 Top off 28 days" button in calendar controls

## Migrations

- **0015_add_marketing_scheduler.py**: Adds scheduling fields and unique constraint

## API Endpoints

### POST `/api/v1/marketing/scheduler/topoff?tenant_id={tenant}&days={days}`

**Query Parameters:**
- `tenant_id` (required): Tenant ID
- `days` (optional, default=28): Rolling horizon in days (1-90)

**Response:**
```json
{
  "accounts_processed": 2,
  "instances_created": 56,
  "instances_skipped": 0,
  "window_start": "2025-01-21T00:00:00",
  "window_end": "2025-02-18T00:00:00",
  "message": "Created 56 new slots, skipped 0 existing"
}
```

## Testing Commands

### 1. Run Migration
```bash
cd apps/api
alembic upgrade head
```

### 2. Test API Endpoint
```bash
# Get auth token first (login)
TOKEN="your_jwt_token"

# Top off slots for tenant
curl -X POST "http://localhost:8000/api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: First run creates X slots, second run creates 0 (idempotent)
```

### 3. Verify Calendar Shows Slots
```bash
# Get calendar view
curl "http://localhost:8000/api/v1/marketing/calendar?tenant_id=h2o&start_date=2025-01-21T00:00:00&end_date=2025-02-18T00:00:00" \
  -H "Authorization: Bearer $TOKEN"

# Should return object with date keys and PostInstance arrays
```

### 4. Verify No Duplicates (Database)
```sql
-- Check for duplicates (should return 0 rows)
SELECT tenant_id, channel_account_id, scheduled_for, COUNT(*) as count
FROM post_instances
WHERE scheduled_for IS NOT NULL
GROUP BY tenant_id, channel_account_id, scheduled_for
HAVING COUNT(*) > 1;

-- Verify unique constraint exists
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_name = 'uq_post_instances_tenant_account_scheduled';
```

## UI Changes

- Calendar view now displays PostInstances with status='Planned' in purple
- "📅 Top off 28 days" button in calendar controls (admin/any user can trigger)
- Button shows loading state while generating
- Toast notification shows results (X created, Y skipped)

## Background Execution

The scheduler runs automatically:
- **Frequency**: Daily at 2:00 AM (server time)
- **Scope**: All tenants (processes each tenant's active ChannelAccounts)
- **Method**: APScheduler cron job in `main.py` startup
- **No frontend dependency**: Runs server-side regardless of user activity

## Idempotency Proof

1. **Database Level**: Unique constraint prevents duplicates at DB level
2. **Application Level**: Logic checks for existing instances before creating
3. **Test**: Run endpoint twice - first creates slots, second creates 0

## Safety Guarantees

- ✅ Never overwrites existing content (checks `content_item_id != placeholder.id`)
- ✅ Never modifies instances beyond Planned/Draft status
- ✅ Only creates missing slots
- ✅ Tenant-aware (no hardcoded tenant IDs)
- ✅ Additive only (no deletions or modifications of existing data)

