# Marketing System Full Audit - Calendar Only Showing 2 Events

**Date**: 2025-01-23  
**Issue**: Marketing calendar tab only showing 2 events, not ready for use  
**Auditor**: Full Stack Audit

---

## Executive Summary

The marketing calendar system uses a modern architecture with `ContentItem` and `PostInstance` models, but there are potential issues with:
1. **Legacy code paths** (`routes_marketing.py` still references old `ContentPost` model)
2. **Data flow** from API to frontend calendar display
3. **Date range filtering** in calendar queries
4. **Status filtering** that might exclude valid posts
5. **Empty state handling** when no posts exist

---

## 1. Architecture Overview

### Current System (Active)
- **Models**: `ContentItem`, `PostInstance`, `ChannelAccount`, `MarketingChannel`
- **API Routes**: `apps/api/app/api/marketing.py` (async, FastAPI)
- **Scheduler**: `apps/api/app/api/marketing_scheduler.py` (topoff endpoint)
- **Frontend**: `apps/web/app/marketing/page.tsx` (4314 lines)

### Legacy System (Deprecated but Still Present)
- **Old Model**: `ContentPost` (table exists, model removed from code)
- **Legacy Routes**: `apps/api/app/routes_marketing.py` (sync, SQLAlchemy ORM)
- **Status**: Legacy routes exist but may not be registered in main router

---

## 2. Data Models

### PostInstance Model (`apps/api/app/models.py:260-298`)
```python
class PostInstance(Base):
    __tablename__ = "post_instances"
    
    id: UUID
    tenant_id: str
    content_item_id: UUID (nullable=True)  # NULL for planned slots
    channel_account_id: UUID (required)
    caption_override: str (nullable)
    scheduled_for: datetime (nullable=True)  # NULL = unscheduled
    status: str = 'Draft'  # Valid: 'Planned', 'Draft', 'Scheduled', 'Posted', 'Failed'
    suggested_category: str (nullable)  # 'ad_content', 'team_post', 'coupon', 'diy', 'blog_post'
    posted_at: datetime (nullable)
    post_url: str (nullable)
    posted_manually: bool
    screenshot_url: str (nullable)
    autopost_enabled: bool
    publish_job_id: UUID (nullable)
    last_error: str (nullable)
    
    # Relationships
    content_item: Optional[ContentItem]  # Can be None for planned slots
    channel_account: ChannelAccount  # Always required
```

**Key Points**:
- `content_item_id` can be NULL (planned slots without content)
- `scheduled_for` can be NULL (unscheduled posts)
- Status values: `['Planned', 'Draft', 'Scheduled', 'Posted', 'Failed']`

### ContentItem Model (`apps/api/app/models.py:218-243`)
```python
class ContentItem(Base):
    __tablename__ = "content_items"
    
    id: UUID
    tenant_id: str
    title: str
    base_caption: str (nullable)
    media_urls: List[str] (nullable)
    cta_type: str (nullable)
    cta_url: str (nullable)
    tags: List[str] (nullable)
    target_city: str (nullable)
    content_category: str (nullable)  # 'ad_content', 'team_post', 'coupon', 'diy', 'blog_post'
    status: str = 'Idea'  # Valid: 'Idea', 'Draft', 'Needs Approval', 'Scheduled', 'Posted'
    owner: str
    reviewer: str (nullable)
    draft_due_date: datetime (nullable)
    notes: str (nullable)
    
    # Relationships
    post_instances: List[PostInstance]
    media_assets: List[MediaAsset]
```

**Key Points**:
- ContentItem status is different from PostInstance status
- ContentItem can have multiple PostInstances (one per channel account)

---

## 3. API Routes & Endpoints

### Active Marketing Routes (`apps/api/app/api/marketing.py`)

**Router Registration**:
- Prefix: `/marketing`
- Registered in: `apps/api/app/api/router.py:115-119`
- Main app includes: `apps/api/app/main.py` (via router.include_router)

**Key Endpoints**:

#### GET `/marketing/calendar` (Line 647-695)
```python
@router.get("/calendar")
async def get_calendar_view(
    tenant_id: str = Query(...),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user)
)
```

**Query Logic**:
1. Filters by `tenant_id`
2. Filters by `start_date` if provided (>=)
3. Filters by `end_date` if provided (<=)
4. **CRITICAL**: Only includes posts where `scheduled_for IS NOT NULL` (line 663)
5. Orders by `scheduled_for`
6. Uses `joinedload` for relationships (content_item, channel_account)
7. Groups by date: `{ "2025-01-15": [PostInstance, ...] }`

**Response Format**:
```json
{
  "2025-01-15": [
    {
      "id": "uuid",
      "scheduled_for": "2025-01-15T09:00:00Z",
      "status": "Planned",
      "content_item": null,  // or ContentItem object
      "channel_account": { ... }
    }
  ]
}
```

**Potential Issues**:
- ⚠️ Only returns posts with `scheduled_for IS NOT NULL` - unscheduled posts excluded
- ⚠️ If `start_date`/`end_date` not provided, returns ALL scheduled posts (could be many)
- ⚠️ Serialization errors are logged but skipped (line 689-693)

#### GET `/marketing/post-instances` (Line 100-150)
```python
@router.get("/post-instances", response_model=List[schemas_marketing.PostInstance])
```

**Query Logic**:
- Filters by `tenant_id` (required)
- Optional filters: `status`, `channel_account_id`, `content_item_id`
- Optional date filters: `scheduled_from`, `scheduled_to`
- **No limit by default** - could return many results

#### POST `/marketing/post-instances/bulk` (Line 200-250)
```python
@router.post("/post-instances/bulk")
```

**Creates multiple PostInstances** from a ContentItem for multiple channel accounts.

#### POST `/marketing/scheduler/topoff` (`apps/api/app/api/marketing_scheduler.py:296-309`)
```python
@router.post("/topoff")
async def topoff_scheduler(
    tenant_id: str = Query(...),
    days: int = Query(28, ge=1, le=90),
    ...
)
```

**Logic** (`topoff_scheduler_logic`, lines 117-293):
1. Calculates date range: `now` to `now + days`
2. Gets all active channel accounts for tenant
3. For each account, computes target datetimes based on:
   - `posts_per_week` (default: 3)
   - `schedule_timezone` (default: 'America/Los_Angeles')
   - `schedule_times` (default: ['09:00'])
4. Creates PostInstances with:
   - `content_item_id = NULL` (planned slots)
   - `status = 'Planned'`
   - `scheduled_for = computed_datetime`
   - `suggested_category = rotated category`

**Skip Conditions** (lines 239-251):
- Skips if instance already exists at that datetime
- Skips if existing instance has `content_item_id IS NOT NULL` (has real content)
- Skips if existing instance status not in `['Planned', 'Draft']`

---

## 4. Frontend Implementation

### Calendar View Component (`apps/web/app/marketing/page.tsx:1118-4314`)

#### Data Loading (`loadCalendar`, lines 1209-1276)

**API Call**:
```typescript
const params = new URLSearchParams({
  tenant_id: 'h2o',
  start_date: start.toISOString(),
  end_date: end.toISOString()
})

const response = await fetch(`${API_BASE_URL}/marketing/calendar?${params}`, {
  headers,
  credentials: 'include'
})
```

**Date Range Calculation**:
- **Month view**: First day of month to last day (with week padding)
- **Week view**: `currentDate - 7 days` to `currentDate + 30 days`

**Data Transformation** (lines 1255-1267):
```typescript
// API returns: { "2024-12-18": [...] }
// Frontend expects: [{ date: "2024-12-18", instances: [...] }]

if (Array.isArray(data)) {
  calendarArray = data
} else if (data && typeof data === 'object') {
  calendarArray = Object.entries(data).map(([date, instances]) => ({
    date,
    instances: Array.isArray(instances) ? instances : []
  }))
}
```

**Potential Issues**:
- ⚠️ If API returns empty object `{}`, `calendarArray = []` (no error)
- ⚠️ If API returns array format, assumes it's already in correct format
- ⚠️ No error handling for malformed responses

#### Calendar Display (`getInstancesForDate`, lines 1323-1327)
```typescript
const getInstancesForDate = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0]  // "2025-01-15"
  const dayData = calendarData.find(d => d.date === dateStr)
  return dayData?.instances || []
}
```

**Potential Issues**:
- ⚠️ Date string matching relies on ISO format (`YYYY-MM-DD`)
- ⚠️ Timezone differences could cause mismatches
- ⚠️ If `calendarData` is empty, returns `[]` (no error)

#### Calendar Grid Rendering (lines 1658-1800)
- Renders 7 columns (Sun-Sat)
- For each day, calls `getInstancesForDate(day)`
- Displays instances as small cards
- Shows status badges, account names, content titles

---

## 5. Data Flow Analysis

### Complete Flow: Database → API → Frontend

```
1. Database (PostInstance table)
   ↓
2. API Query (marketing.py:656-675)
   - Filters: tenant_id, start_date, end_date, scheduled_for IS NOT NULL
   - Joins: content_item, channel_account
   - Groups by date
   ↓
3. API Response (marketing.py:695)
   - Format: { "2025-01-15": [PostInstance, ...] }
   ↓
4. Frontend Fetch (marketing/page.tsx:1246-1249)
   - URL: /api/v1/marketing/calendar?tenant_id=h2o&start_date=...&end_date=...
   ↓
5. Frontend Transform (marketing/page.tsx:1255-1267)
   - Converts object to array: [{ date: "2025-01-15", instances: [...] }]
   ↓
6. Frontend Display (marketing/page.tsx:1323-1800)
   - getInstancesForDate() finds instances for each day
   - Renders calendar grid with instances
```

### Potential Failure Points

1. **Database Level**:
   - No PostInstances exist for tenant 'h2o'
   - PostInstances exist but `scheduled_for IS NULL` (excluded by query)
   - PostInstances exist but outside date range

2. **API Level**:
   - Query filters too restrictive
   - Serialization errors (logged but skipped)
   - Date range calculation incorrect
   - Timezone issues

3. **Frontend Level**:
   - Date string format mismatch
   - Empty response handling
   - Date range calculation incorrect
   - Transform logic incorrect

---

## 6. Legacy Code Analysis

### Legacy Routes (`apps/api/app/routes_marketing.py`)

**Status**: File exists but may not be registered in main router

**Content**:
- Uses old `ContentPost` model (removed from models.py)
- Sync SQLAlchemy ORM (not async)
- Has `/calendar` endpoint (line 267) that queries `ContentPost` table
- **CRITICAL**: This is a DIFFERENT endpoint than the active one

**Registration Check**:
- `apps/api/app/api/router.py` imports from `.marketing` (async version)
- `apps/api/app/main.py` includes router from `api.router`
- **Legacy routes_marketing.py is NOT imported anywhere**

**Conclusion**: Legacy routes exist but are NOT active. However, if the `content_posts` table still has data, it won't show up in the new system.

---

## 7. Issue Diagnosis: Only 2 Events Showing

### 🔴 CRITICAL FINDING: Display Limitation

**File**: `apps/web/app/marketing/page.tsx:1688`

```typescript
{instances.slice(0, viewMode === 'month' ? 2 : 3).map((instance: any) => {
```

**Issue**: The calendar is **artificially limiting** the display to:
- **Month view**: Only shows **2 instances per day** (`.slice(0, 2)`)
- **Week view**: Only shows **3 instances per day** (`.slice(0, 3)`)

**This means**: Even if there are 10 PostInstances scheduled for a day, only 2 will be displayed in month view.

**Solution**: Remove or increase the slice limit, or add a "Show more" indicator.

### Possible Causes

#### Cause 1: Only 2 PostInstances Exist in Database
**Check**: Query database directly
```sql
SELECT COUNT(*) FROM post_instances WHERE tenant_id = 'h2o' AND scheduled_for IS NOT NULL;
```

**Solution**: Run topoff scheduler to create more planned slots

#### Cause 2: Date Range Filter Too Narrow
**Check**: Frontend date calculation (lines 1216-1231)
- Month view: First to last day of month
- Week view: `currentDate - 7` to `currentDate + 30`

**Issue**: If `currentDate` is today and only 2 events exist in the future, only 2 will show

**Solution**: Verify date range includes all existing PostInstances

#### Cause 3: Status Filter Excluding Posts
**Check**: API query doesn't filter by status, but frontend might

**Issue**: If posts have status not in `['Planned', 'Draft', 'Scheduled', 'Posted', 'Failed']`, they might be excluded

**Solution**: Check PostInstance statuses in database

#### Cause 4: scheduled_for IS NULL
**Check**: API query excludes `scheduled_for IS NULL` (line 663)

**Issue**: If PostInstances exist but aren't scheduled, they won't appear

**Solution**: Schedule unscheduled posts or include them in a different view

#### Cause 5: Serialization Errors
**Check**: API logs warnings for serialization failures (line 691)

**Issue**: PostInstances with invalid relationships might be skipped

**Solution**: Check API logs for serialization warnings

#### Cause 6: Frontend Date String Mismatch
**Check**: `getInstancesForDate` uses `date.toISOString().split('T')[0]`

**Issue**: If API returns dates in different format, matching fails

**Solution**: Verify date format consistency

#### Cause 7: Display Limitation (MOST LIKELY)
**Check**: Line 1688 in `apps/web/app/marketing/page.tsx`

**Issue**: `.slice(0, 2)` limits month view to 2 instances per day

**Solution**: Remove slice limit or add "Show more" functionality

---

## 8. Testing Checklist

### Database Checks
- [ ] Count PostInstances: `SELECT COUNT(*) FROM post_instances WHERE tenant_id = 'h2o';`
- [ ] Count scheduled: `SELECT COUNT(*) FROM post_instances WHERE tenant_id = 'h2o' AND scheduled_for IS NOT NULL;`
- [ ] Check date range: `SELECT MIN(scheduled_for), MAX(scheduled_for) FROM post_instances WHERE tenant_id = 'h2o';`
- [ ] Check statuses: `SELECT status, COUNT(*) FROM post_instances WHERE tenant_id = 'h2o' GROUP BY status;`
- [ ] Check channel accounts: `SELECT COUNT(*) FROM channel_accounts WHERE tenant_id = 'h2o' AND status = 'active';`

### API Checks
- [ ] Test calendar endpoint: `GET /api/v1/marketing/calendar?tenant_id=h2o&start_date=2025-01-01T00:00:00Z&end_date=2025-12-31T23:59:59Z`
- [ ] Check response format: Should return `{ "2025-01-15": [...] }`
- [ ] Check response count: Count total instances across all dates
- [ ] Check for serialization errors in API logs
- [ ] Test without date filters: `GET /api/v1/marketing/calendar?tenant_id=h2o`

### Frontend Checks
- [ ] Check browser console for errors
- [ ] Check Network tab: Verify API call and response
- [ ] Check `calendarData` state: `console.log(calendarData)` in component
- [ ] Verify date range calculation matches API call
- [ ] Check `getInstancesForDate` function: Add logging

### Scheduler Checks
- [ ] Run topoff: `POST /api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28`
- [ ] Verify response: `{ "instances_created": X, "instances_skipped": Y }`
- [ ] Check if channel accounts have scheduling config
- [ ] Verify `posts_per_week` > 0 for accounts

---

## 9. File Structure

### Backend Files
```
apps/api/app/
├── api/
│   ├── marketing.py              # Active async routes (773 lines)
│   ├── marketing_scheduler.py     # Topoff scheduler (311 lines)
│   └── router.py                  # Registers marketing routes
├── models.py                      # PostInstance, ContentItem models
├── schemas_marketing.py           # Pydantic schemas
└── routes_marketing.py            # LEGACY (not used, ContentPost model)
```

### Frontend Files
```
apps/web/app/marketing/
└── page.tsx                       # Main marketing page (4314 lines)
    ├── MarketingContent()         # Main component
    ├── CalendarView()             # Calendar tab (lines 1118-1800)
    ├── PostsView()               # Posts tab (lines 400-1100)
    ├── AccountsView()            # Accounts tab (lines 2400-3000)
    └── DemandSignalsPanel()     # Sidebar panel
```

### Database Migrations
```
apps/api/alembic/versions/
├── 0003_add_marketing_module.py      # Creates content_posts (legacy)
├── 0004_seed_marketing_channels.py   # Seeds channels
├── 0012_add_content_items_and_post_instances.py  # New models
├── 0013_update_publish_job_to_post_instance.py   # Migration
├── 0015_add_marketing_scheduler.py   # Scheduling fields
└── 0017_add_content_categories.py    # Categories
```

---

## 10. API Endpoint Reference

### Active Endpoints (from `apps/api/app/api/marketing.py`)

| Method | Endpoint | Description | Key Filters |
|--------|----------|-------------|-------------|
| GET | `/marketing/channels` | List marketing channels | None |
| GET | `/marketing/channel-accounts` | List channel accounts | `tenant_id` |
| GET | `/marketing/content-items` | List content items | `tenant_id`, `status`, `search` |
| POST | `/marketing/content-items` | Create content item | Body: ContentItemCreate |
| GET | `/marketing/post-instances` | List post instances | `tenant_id`, `status`, `channel_account_id`, `scheduled_from`, `scheduled_to` |
| POST | `/marketing/post-instances/bulk` | Create multiple instances | Body: CreatePostInstancesRequest |
| GET | `/marketing/calendar` | **Calendar view** | `tenant_id`, `start_date`, `end_date` |
| POST | `/marketing/post-instances/{id}/mark-posted` | Mark as posted | Body: MarkPostInstancePostedRequest |
| POST | `/marketing/post-instances/{id}/mark-failed` | Mark as failed | Query: `error_message` |
| POST | `/marketing/media/upload` | Upload media | File upload |

### Scheduler Endpoints (from `apps/api/app/api/marketing_scheduler.py`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/marketing/scheduler/topoff` | Generate planned slots | Query: `tenant_id`, `days` (default: 28) |

---

## 11. Key Code Sections

### API Calendar Query (Critical Section)
**File**: `apps/api/app/api/marketing.py:647-695`

```python
@router.get("/calendar")
async def get_calendar_view(...):
    query = select(models.PostInstance).where(models.PostInstance.tenant_id == tenant_id)
    
    if start_date:
        query = query.where(models.PostInstance.scheduled_for >= start_date)
    if end_date:
        query = query.where(models.PostInstance.scheduled_for <= end_date)
    
    # CRITICAL FILTER: Only scheduled posts
    query = query.where(models.PostInstance.scheduled_for.isnot(None))
    query = query.order_by(models.PostInstance.scheduled_for)
    
    # Load relationships
    result = await db.execute(
        query.options(
            joinedload(models.PostInstance.content_item).selectinload(models.ContentItem.media_assets),
            joinedload(models.PostInstance.channel_account)
        )
    )
    instances = result.unique().scalars().all()
    
    # Group by date
    calendar = {}
    for instance in instances:
        if instance.scheduled_for:
            date_key = instance.scheduled_for.date().isoformat()
            if date_key not in calendar:
                calendar[date_key] = []
            try:
                serialized = schemas_marketing.PostInstance.model_validate(instance)
                calendar[date_key].append(serialized)
            except Exception as e:
                logging.warning(f"Failed to serialize PostInstance {instance.id}: {e}")
                continue  # SKIPS INSTANCE ON ERROR
    
    return calendar
```

**Issues**:
- ⚠️ Line 663: Excludes `scheduled_for IS NULL` - unscheduled posts won't show
- ⚠️ Line 689-693: Serialization errors are logged but instance is skipped
- ⚠️ Line 680: Only includes instances where `instance.scheduled_for` is truthy (double check)

### Frontend Calendar Load (Critical Section)
**File**: `apps/web/app/marketing/page.tsx:1209-1276`

```typescript
async function loadCalendar() {
  try {
    setLoading(true)
    const token = localStorage.getItem('token')
    let start: Date
    let end: Date

    if (viewMode === 'month') {
      // Month view: first to last day of month
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      // Add week padding
      const startDay = start.getDay()
      start.setDate(start.getDate() - startDay)
      const endDay = end.getDay()
      end.setDate(end.getDate() + (6 - endDay))
    } else {
      // Week view: currentDate - 7 to currentDate + 30
      start = new Date(currentDate)
      start.setDate(start.getDate() - 7)
      end = new Date(currentDate)
      end.setDate(end.getDate() + 30)
    }

    const params = new URLSearchParams({
      tenant_id: 'h2o',
      start_date: start.toISOString(),
      end_date: end.toISOString()
    })
    
    const response = await fetch(`${API_BASE_URL}/marketing/calendar?${params}`, {
      headers,
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to load calendar: ${response.statusText}`)
    }
    const data = await response.json()
    
    // Transform object to array
    let calendarArray: any[]
    if (Array.isArray(data)) {
      calendarArray = data
    } else if (data && typeof data === 'object') {
      calendarArray = Object.entries(data).map(([date, instances]) => ({
        date,
        instances: Array.isArray(instances) ? instances : []
      }))
    } else {
      calendarArray = []
    }
    
    setCalendarData(calendarArray)
    setLoading(false)
  } catch (error) {
    console.error('Failed to load calendar:', error)
    setCalendarData([])  // Sets to empty array on error
    setLoading(false)
  }
}
```

**Issues**:
- ⚠️ Line 1228: Week view only looks 30 days ahead - might miss future posts
- ⚠️ Line 1273: On error, sets `calendarData = []` - no error message to user
- ⚠️ Line 1257: If API returns array, assumes correct format (might not be)

---

## 12. Recommended Debugging Steps

### Step 1: Verify Database Data
```sql
-- Check total PostInstances
SELECT COUNT(*) as total FROM post_instances WHERE tenant_id = 'h2o';

-- Check scheduled PostInstances
SELECT COUNT(*) as scheduled 
FROM post_instances 
WHERE tenant_id = 'h2o' 
  AND scheduled_for IS NOT NULL;

-- Check date range
SELECT 
  MIN(scheduled_for) as earliest,
  MAX(scheduled_for) as latest,
  COUNT(*) as count
FROM post_instances 
WHERE tenant_id = 'h2o' 
  AND scheduled_for IS NOT NULL;

-- Check by status
SELECT status, COUNT(*) 
FROM post_instances 
WHERE tenant_id = 'h2o' 
  AND scheduled_for IS NOT NULL
GROUP BY status;

-- Check by date (last 30 days)
SELECT 
  scheduled_for::date as date,
  COUNT(*) as count
FROM post_instances 
WHERE tenant_id = 'h2o' 
  AND scheduled_for IS NOT NULL
  AND scheduled_for >= NOW() - INTERVAL '30 days'
GROUP BY scheduled_for::date
ORDER BY date;
```

### Step 2: Test API Endpoint Directly
```bash
# Get auth token first, then:
curl -X GET "http://localhost:8000/api/v1/marketing/calendar?tenant_id=h2o&start_date=2025-01-01T00:00:00Z&end_date=2025-12-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Check response:
# - Is it an object? { "2025-01-15": [...] }
# - How many dates have instances?
# - How many total instances?
```

### Step 3: Check Frontend Network Tab
1. Open browser DevTools → Network tab
2. Navigate to `/marketing?tab=calendar`
3. Find the `/marketing/calendar` request
4. Check:
   - Request URL (verify date range)
   - Response status (200?)
   - Response body (how many dates/instances?)
   - Response time (slow = query issue?)

### Step 4: Check Display Limitation
**CRITICAL**: Check line 1688 in `apps/web/app/marketing/page.tsx`

The calendar is limiting display to 2 instances per day in month view:
```typescript
{instances.slice(0, viewMode === 'month' ? 2 : 3).map(...)}
```

**Fix**: Remove `.slice()` or increase limit, or show count indicator:
```typescript
{instances.length > 2 && (
  <div>+{instances.length - 2} more</div>
)}
```

### Step 5: Add Frontend Logging
Add to `loadCalendar()` function:
```typescript
console.log('Calendar load - Date range:', {
  start: start.toISOString(),
  end: end.toISOString(),
  viewMode
})

const data = await response.json()
console.log('Calendar API response:', {
  type: typeof data,
  isArray: Array.isArray(data),
  keys: Object.keys(data || {}),
  totalDates: Object.keys(data || {}).length,
  totalInstances: Object.values(data || {}).flat().length,
  data
})

setCalendarData(calendarArray)
console.log('Calendar data set:', {
  length: calendarArray.length,
  firstFew: calendarArray.slice(0, 3)
})
```

### Step 6: Check Channel Accounts Configuration
```sql
-- Check if accounts have scheduling config
SELECT 
  id,
  name,
  posts_per_week,
  schedule_timezone,
  schedule_times,
  status
FROM channel_accounts 
WHERE tenant_id = 'h2o';

-- If posts_per_week is NULL or 0, topoff won't create slots
```

### Step 7: Run Topoff Scheduler
```bash
curl -X POST "http://localhost:8000/api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Check response:
# {
#   "accounts_processed": X,
#   "instances_created": Y,
#   "instances_skipped": Z,
#   ...
# }
```

---

## 13. Common Issues & Solutions

### Issue: No PostInstances Exist
**Symptom**: Calendar is empty
**Solution**: Run topoff scheduler to create planned slots

### Issue: PostInstances Exist But Not Scheduled
**Symptom**: Count in database > count in calendar
**Solution**: Either schedule them or modify API to include unscheduled posts

### Issue: Date Range Too Narrow
**Symptom**: Only shows posts in current month/week
**Solution**: Expand date range in frontend or remove date filters

### Issue: Serialization Errors
**Symptom**: API logs warnings, some posts missing
**Solution**: Fix relationship loading or handle null content_item properly

### Issue: Channel Accounts Not Configured
**Symptom**: Topoff creates 0 instances
**Solution**: Set `posts_per_week`, `schedule_timezone`, `schedule_times` on channel accounts

### Issue: Timezone Mismatch
**Symptom**: Posts appear on wrong day
**Solution**: Ensure API stores UTC, frontend converts to local timezone

### Issue: Display Limitation (MOST LIKELY CAUSE)
**Symptom**: Only 2 events showing per day
**Root Cause**: Line 1688 limits display with `.slice(0, 2)`
**Solution**: Remove slice limit or add "Show more" indicator

---

## 14. Files to Review

### Critical Files
1. `apps/api/app/api/marketing.py` - Calendar endpoint (lines 647-695)
2. `apps/web/app/marketing/page.tsx` - Calendar view (lines 1118-1800)
3. `apps/api/app/api/marketing_scheduler.py` - Topoff logic (lines 117-293)
4. `apps/api/app/models.py` - PostInstance model (lines 260-298)

### Supporting Files
5. `apps/api/app/schemas_marketing.py` - Response schemas
6. `apps/api/app/api/router.py` - Route registration (lines 114-124)
7. `apps/api/app/main.py` - App initialization

### Legacy Files (Reference Only)
8. `apps/api/app/routes_marketing.py` - Old ContentPost routes (NOT USED)

---

## 15. Next Steps for Claude

1. **Run database queries** to verify PostInstance count and date ranges
2. **Test API endpoint directly** to see raw response
3. **Add frontend logging** to see what data is received
4. **Check browser console** for JavaScript errors
5. **Verify channel accounts** have scheduling configuration
6. **Run topoff scheduler** if needed to create more slots
7. **Check API logs** for serialization warnings
8. **Verify date range** calculation matches actual data

---

**End of Audit**

