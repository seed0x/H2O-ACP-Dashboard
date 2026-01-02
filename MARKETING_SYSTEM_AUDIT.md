# Marketing System Audit Report
**Date:** 2025-01-XX  
**Auditor Role:** Senior Full-Stack Auditor (Diagnostic Only)  
**Scope:** Marketing System - Calendar, Post Instances, Content Items, Channel Accounts, Scheduler/Top-off, Marketing UI (Next.js), Marketing API (FastAPI)

---

## 1️⃣ System Wiring Map (Truth Table)

| Feature | Frontend File + Line | API Endpoint + Method | Backend Handler File + Function | DB Tables Touched | Expected Behavior | Actual Behavior |
|---------|---------------------|----------------------|-------------------------------|-------------------|-------------------|-----------------|
| Calendar load | `apps/web/app/marketing/page.tsx:1142-1209` | `GET /api/v1/marketing/calendar?tenant_id=h2o&start_date=...&end_date=...` | `apps/api/app/api/marketing.py:637-685` `get_calendar_view()` | `post_instances`, `content_items`, `channel_accounts` | Returns object `{ "2024-12-18": [PostInstance...] }` grouped by date | **UNVERIFIED - Requires curl test** |
| PostInstances list | `apps/web/app/marketing/page.tsx:2411` | `GET /api/v1/marketing/post-instances?tenant_id=h2o&content_item_id=...` | `apps/api/app/api/marketing.py:316-345` `list_post_instances()` | `post_instances` | Returns array of PostInstance with relationships loaded | **UNVERIFIED - Requires curl test** |
| PostInstances create | `apps/web/app/marketing/page.tsx:1351` | `POST /api/v1/marketing/post-instances/bulk?tenant_id=h2o` | `apps/api/app/api/marketing.py:395-452` `create_post_instances_bulk()` | `post_instances`, `audit_logs` | Creates multiple PostInstances, returns array | **UNVERIFIED - Requires curl test** |
| Scheduler/top-off | `apps/web/app/marketing/page.tsx:1262-1293` | `POST /api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28` | `apps/api/app/api/marketing_scheduler.py:255-268` `topoff_scheduler()` | `post_instances`, `channel_accounts` | Creates planned slots, returns summary | **UNVERIFIED - Requires curl test** |
| ContentItem creation | `apps/web/app/marketing/page.tsx:1325-1340` | `POST /api/v1/marketing/content-items` | `apps/api/app/api/marketing.py:224-242` `create_content_item()` | `content_items`, `audit_logs` | Creates ContentItem, returns full object | **UNVERIFIED - Requires curl test** |
| ChannelAccount load | `apps/web/app/marketing/page.tsx:1095-1115` | `GET /api/v1/marketing/channel-accounts?tenant_id=h2o` | `apps/api/app/api/marketing.py:85-97` `list_channel_accounts()` | `channel_accounts` | Returns array of ChannelAccount | **UNVERIFIED - Requires curl test** |

**CRITICAL FINDING:** There are TWO marketing route files:
- `apps/api/app/api/marketing.py` (async, uses `get_session`) - **ACTIVE** (imported in router.py:35)
- `apps/api/app/routes_marketing.py` (sync, uses `get_db`) - **UNUSED/LEGACY?**

The router imports from `api.marketing`, so `routes_marketing.py` appears to be dead code.

---

## 2️⃣ API Reality Check (No Assumptions)

**NOTE:** These curl commands assume:
- API base URL: `http://localhost:8000` (development) or `https://h2o-acp-dashboard.onrender.com` (production)
- Authentication token required (obtain via `/api/v1/login`)
- Tenant ID: `h2o`

### Test 1: GET /api/v1/marketing/calendar

```bash
curl -X GET "http://localhost:8000/api/v1/marketing/calendar?tenant_id=h2o&start_date=2025-01-01T00:00:00Z&end_date=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response Shape:**
```json
{
  "2025-01-15": [
    {
      "id": "uuid",
      "tenant_id": "h2o",
      "content_item_id": "uuid-or-null",
      "channel_account_id": "uuid",
      "scheduled_for": "2025-01-15T09:00:00Z",
      "status": "Scheduled",
      "content_item": { ... } or null,
      "channel_account": { ... }
    }
  ]
}
```

**Actual Result:** ⚠️ **NOT TESTED - Requires running API server**

**Frontend Expectation:** Lines 1188-1200 in `page.tsx` handle both array and object formats, but expects object format `{ "date": "instances" }`.

---

### Test 2: GET /api/v1/marketing/post-instances

```bash
curl -X GET "http://localhost:8000/api/v1/marketing/post-instances?tenant_id=h2o" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response:** Array of PostInstance objects with `content_item` and `channel_account` relationships.

**Actual Result:** ⚠️ **NOT TESTED**

---

### Test 3: GET /api/v1/marketing/channel-accounts

```bash
curl -X GET "http://localhost:8000/api/v1/marketing/channel-accounts?tenant_id=h2o" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response:** Array of ChannelAccount objects.

**Actual Result:** ⚠️ **NOT TESTED**

---

### Test 4: POST /api/v1/marketing/post-instances/bulk

```bash
curl -X POST "http://localhost:8000/api/v1/marketing/post-instances/bulk?tenant_id=h2o" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "content_item_id": "uuid-here",
    "channel_account_ids": ["uuid1", "uuid2"],
    "scheduled_for": "2025-01-20T09:00:00Z"
  }'
```

**Expected Response:** Array of created PostInstance objects.

**Actual Result:** ⚠️ **NOT TESTED**

---

### Test 5: POST /api/v1/marketing/scheduler/topoff

```bash
curl -X POST "http://localhost:8000/api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "accounts_processed": 2,
  "instances_created": 10,
  "instances_skipped": 5,
  "window_start": "2025-01-XX...",
  "window_end": "2025-01-XX...",
  "message": "Created 10 new slots, skipped 5 existing"
}
```

**Actual Result:** ⚠️ **NOT TESTED**

---

## 3️⃣ Frontend Failure Evidence

**Browser Console Errors:** ⚠️ **NOT CAPTURED - Requires running frontend**

**Network Tab Failures:** ⚠️ **NOT CAPTURED - Requires running frontend**

**Expected Frontend Behavior:**
- Calendar view loads PostInstances grouped by date
- Empty calendar shows "No posts scheduled" message
- Post creation flow: ContentItem → PostInstances (bulk)
- Top-off button creates planned slots

**Potential Failure Points (Code Analysis):**

1. **API_BASE_URL Configuration** (`apps/web/lib/config.ts:9`):
   - Development: Falls back to `/api/v1` (relative)
   - Production: Uses `NEXT_PUBLIC_API_URL` or Render URL
   - **RISK:** If `NEXT_PUBLIC_API_URL` not set in production, frontend may call wrong endpoint

2. **Calendar Data Transformation** (`apps/web/app/marketing/page.tsx:1188-1200`):
   - Handles both array and object formats
   - If API returns empty object `{}`, calendar shows empty
   - **RISK:** No error handling if API returns unexpected format

3. **Relationship Loading** (`apps/api/app/api/marketing.py:338-340`):
   - Uses `joinedload()` to eager load relationships
   - **RISK:** If relationship fails to load, serialization may fail (line 677 catches but logs warning)

4. **Authentication** (`apps/web/app/marketing/page.tsx:1145,1170`):
   - Token from `localStorage.getItem('token')`
   - **RISK:** If token missing/invalid, API returns 401, frontend shows empty state

---

## 4️⃣ Data Presence Check (DB Truth)

**Database Queries Required:** ⚠️ **NOT EXECUTED - Requires database access**

### Required Queries:

```sql
-- Check ChannelAccounts
SELECT COUNT(*) as count, tenant_id, status 
FROM channel_accounts 
WHERE tenant_id = 'h2o' 
GROUP BY tenant_id, status;

-- Check PostInstances
SELECT COUNT(*) as count, status, 
  COUNT(CASE WHEN scheduled_for IS NOT NULL THEN 1 END) as with_scheduled,
  COUNT(CASE WHEN content_item_id IS NOT NULL THEN 1 END) as with_content,
  COUNT(CASE WHEN channel_account_id IS NOT NULL THEN 1 END) as with_account
FROM post_instances 
WHERE tenant_id = 'h2o'
GROUP BY status;

-- Check ContentItems
SELECT COUNT(*) as count, status 
FROM content_items 
WHERE tenant_id = 'h2o' 
GROUP BY status;

-- Check for orphan PostInstances (missing channel_account)
SELECT pi.id, pi.tenant_id, pi.channel_account_id
FROM post_instances pi
LEFT JOIN channel_accounts ca ON pi.channel_account_id = ca.id
WHERE pi.tenant_id = 'h2o' AND ca.id IS NULL;

-- Check for PostInstances with null scheduled_for in calendar range
SELECT COUNT(*) as count
FROM post_instances
WHERE tenant_id = 'h2o' 
  AND scheduled_for IS NULL
  AND status IN ('Scheduled', 'Planned');
```

**Expected Answers:**
- "Calendar is empty because ___" - **CANNOT DETERMINE WITHOUT DB ACCESS**
- "UI is empty because ___" - **CANNOT DETERMINE WITHOUT DB ACCESS**
- "Scheduler created slots but ___" - **CANNOT DETERMINE WITHOUT DB ACCESS**

---

## 5️⃣ Scheduler Verification

**Scheduler Implementation:** ✅ **EXISTS**

**Location:** `apps/api/app/core/tasks.py:16-39` → `apps/api/app/api/marketing_scheduler.py:117-252`

**Trigger Mechanism:**
- **Cron Job:** Daily at 2 AM (configured in `apps/api/app/main.py:168-174`)
- **Manual:** POST `/api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28`

**Last Run Status:** ⚠️ **UNKNOWN - Requires checking scheduler logs or database timestamps**

**Idempotency Check:** ⚠️ **NOT TESTED**

**Code Analysis:**
- Lines 196-214 in `marketing_scheduler.py` check for existing instances by datetime (rounded to minute)
- Skips if `content_item_id IS NOT NULL` (has real content)
- Skips if status not in `['Planned', 'Draft']`
- **POTENTIAL ISSUE:** If instance exists with `content_item_id=NULL` and status='Planned', it's skipped (line 213), but what if status is 'Scheduled'? It would be skipped too (line 208-210).

**Expected Behavior:**
- First run: Creates planned slots for next 28 days
- Second run: Skips existing slots, only creates missing ones

**Actual Behavior:** ⚠️ **NOT VERIFIED**

---

## 6️⃣ Contract Mismatch List

### Mismatch 1: Calendar Response Format
- **Backend** (`apps/api/app/api/marketing.py:685`): Returns object `{ "2025-01-15": [...] }`
- **Frontend** (`apps/web/app/marketing/page.tsx:1192-1197`): Handles both array and object, but expects object
- **Status:** ✅ **MATCHES** (frontend is defensive)

### Mismatch 2: PostInstance.content_item Nullability
- **Backend Schema** (`apps/api/app/schemas_marketing.py:194`): `content_item: Optional[ContentItem] = None`
- **Backend Model** (`apps/api/app/models.py:251`): `content_item_id = Column(..., nullable=True)`
- **Frontend Usage** (`apps/web/app/marketing/page.tsx:1621`): Accesses `instance.content_item` without null check in some places
- **Status:** ⚠️ **POTENTIAL NULL REFERENCE ERROR** if frontend assumes content_item always exists

### Mismatch 3: API Path Prefix
- **Backend Router** (`apps/api/app/api/marketing.py:19`): `router = APIRouter(prefix="/marketing", ...)`
- **Main App** (`apps/api/app/main.py:215`): `app.include_router(router, prefix="/api/v1")`
- **Frontend** (`apps/web/app/marketing/page.tsx:1179`): Calls `${API_BASE_URL}/marketing/calendar`
- **API_BASE_URL** (`apps/web/lib/config.ts:9`): Includes `/api/v1` suffix
- **Status:** ✅ **MATCHES** (full path: `/api/v1/marketing/calendar`)

### Mismatch 4: Status Values
- **Backend Schema** (`apps/api/app/schemas_marketing.py:170`): Valid statuses: `['Planned', 'Draft', 'Scheduled', 'Posted', 'Failed']`
- **Frontend Filter** (`apps/web/app/marketing/page.tsx:815`): Filters by `'Needs Approval'` (not a PostInstance status, this is ContentItem status)
- **Status:** ⚠️ **CONFUSION** - Frontend mixes ContentItem status filters with PostInstance display

### Mismatch 5: ContentItem vs PostInstance Status
- **ContentItem Status** (`apps/api/app/schemas_marketing.py:110`): `['Idea', 'Draft', 'Needs Approval', 'Scheduled', 'Posted']`
- **PostInstance Status** (`apps/api/app/schemas_marketing.py:170`): `['Planned', 'Draft', 'Scheduled', 'Posted', 'Failed']`
- **Frontend** (`apps/web/app/marketing/page.tsx:815`): Filters ContentItems by status, but calendar shows PostInstances
- **Status:** ⚠️ **CONCEPTUAL MISMATCH** - Calendar should show PostInstances, not ContentItems

### Mismatch 6: Relationship Loading
- **Backend** (`apps/api/app/api/marketing.py:338-340`): Uses `joinedload()` to eager load relationships
- **Backend** (`apps/api/app/api/marketing.py:677`): Catches serialization errors but only logs warning
- **Frontend** (`apps/web/app/marketing/page.tsx:1621`): Assumes `instance.content_item` and `instance.channel_account` exist
- **Status:** ⚠️ **POTENTIAL ERROR** - If serialization fails, instance is skipped (line 683), frontend never sees it

### Mismatch 7: Error Response Format
- **Backend** (`apps/api/app/api/marketing.py`): Uses FastAPI HTTPException (returns `{"detail": "..."}`)
- **Frontend** (`apps/web/app/marketing/page.tsx:1183-1184`): Checks `response.ok`, then calls `response.json()` for errors
- **Status:** ✅ **MATCHES** (FastAPI standard format)

---

## 7️⃣ Root Cause Summary (Ranked)

### P0 - Critical (System Broken)

**1. No Verified API Connectivity**
- **Why:** All endpoints untested, cannot confirm API is accessible
- **Symptoms:** Calendar empty, posts not loading, errors in browser console
- **Must Fix:** Test all endpoints with curl, verify authentication, check CORS

**2. Database State Unknown**
- **Why:** No queries executed to verify data exists
- **Symptoms:** Calendar empty could be due to no data OR broken API
- **Must Fix:** Run SQL queries to verify:
  - ChannelAccounts exist for tenant 'h2o'
  - PostInstances exist with `scheduled_for IS NOT NULL`
  - ContentItems exist
  - No orphaned PostInstances

**3. Potential Null Reference Errors**
- **Why:** Frontend accesses `instance.content_item` without null checks in some paths
- **Symptoms:** JavaScript errors when viewing planned slots (content_item_id is NULL)
- **Must Fix:** Add null checks in frontend where `content_item` is accessed

### P1 - High (Features Don't Work)

**4. Scheduler Idempotency Unverified**
- **Why:** Top-off logic exists but not tested for duplicate prevention
- **Symptoms:** Running top-off multiple times may create duplicates or skip incorrectly
- **Must Fix:** Test scheduler twice, verify no duplicates created

**5. Status Value Confusion**
- **Why:** Frontend filters ContentItems by status but calendar shows PostInstances (different status values)
- **Symptoms:** Filter buttons don't work correctly, calendar shows wrong items
- **Must Fix:** Clarify which entity status is being filtered/displayed

### P2 - Medium (Edge Cases)

**6. Serialization Error Handling**
- **Why:** Backend catches serialization errors but only logs (line 682), instance is skipped
- **Symptoms:** Some PostInstances may not appear in calendar without user knowing why
- **Optional Fix:** Return partial data or better error messages

**7. API_BASE_URL Configuration Risk**
- **Why:** Production relies on environment variable, fallback may be incorrect
- **Symptoms:** Production frontend calls wrong API URL
- **Optional Fix:** Add explicit error if API_BASE_URL not configured

---

## 8️⃣ Explicit "What's Missing" Section

**Marketing is still broken because the following required pieces are missing or incomplete:**

1. **❌ API Endpoint Testing** - No curl output exists to prove endpoints work
2. **❌ Database Verification** - No SQL queries executed to prove data exists
3. **❌ Frontend Error Capture** - No browser console errors or network failures documented
4. **❌ Authentication Verification** - Token flow not tested end-to-end
5. **❌ Scheduler Execution Proof** - No evidence scheduler has run or created slots
6. **❌ Null Safety in Frontend** - Planned slots (content_item_id=NULL) may cause frontend errors
7. **❌ Status Filter Clarity** - Frontend mixes ContentItem and PostInstance status filtering
8. **❌ Error Visibility** - Backend silently skips PostInstances that fail serialization (line 683)
9. **❌ CORS Configuration** - Not verified if CORS allows frontend to call API
10. **❌ Environment Variable Validation** - API_BASE_URL may be misconfigured in production

**Additional Findings:**

- **Dead Code:** `apps/api/app/routes_marketing.py` exists but is not imported (sync-based, legacy?)
- **Dual Route Files:** Two marketing route implementations exist, only async version is active
- **Missing Tests:** No unit tests or integration tests found for marketing endpoints
- **No Logging:** Backend logs warnings but no structured logging for debugging

---

## Audit Conclusion

**Status:** ⚠️ **INCOMPLETE - Requires Live System Testing**

This audit is based on **code analysis only**. To complete the audit, the following must be executed:

1. Start API server and test all endpoints with curl
2. Connect to database and run verification queries
3. Start frontend and capture browser console/network errors
4. Test scheduler execution (manual trigger)
5. Verify authentication flow end-to-end

**Without live testing, it is impossible to determine if the marketing system is broken due to:**
- Missing data
- Broken API endpoints
- Frontend errors
- Configuration issues
- Authentication failures

**Next Steps for Third Party:**
1. Run the curl commands in Section 2
2. Execute the SQL queries in Section 4
3. Capture browser console errors from Section 3
4. Test scheduler manually via POST endpoint
5. Review findings and prioritize fixes

---

**End of Audit Report**





