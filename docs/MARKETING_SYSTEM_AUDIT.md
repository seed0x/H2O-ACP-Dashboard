# Marketing System Audit: Preloaded Posts & Content Scheduling

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Model](#data-model)
3. [Preloaded Posts (Planned Slots) Flow](#preloaded-posts-planned-slots-flow)
4. [Content Creation & Assignment](#content-creation--assignment)
5. [API Endpoints](#api-endpoints)
6. [Background Automation](#background-automation)
7. [Frontend Components](#frontend-components)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Architecture

The marketing system uses a **two-tier model**:
- **ContentItem**: Reusable content (title, caption, media, CTA)
- **PostInstance**: A specific scheduled post of a ContentItem to a ChannelAccount

This allows:
- One piece of content to be posted to multiple accounts
- Pre-scheduled "planned slots" without content (preloaded posts)
- Per-account customization (caption overrides)

---

## 📊 Data Model

### ChannelAccount
**Location**: `apps/api/app/models.py:207-216`

Represents a connected social media account (e.g., "H2O Plumbers Facebook Page").

**Key Fields for Scheduling**:
```python
posts_per_week: int = 3  # Default: 3 posts per week
schedule_timezone: str = 'America/Los_Angeles'  # IANA timezone
schedule_times: List[str] = ['09:00']  # Array of times like ["09:00", "14:00"]
status: str = 'active'  # Must be 'active' for scheduler to process
```

**Purpose**: Defines how often and when posts should be scheduled for this account.

---

### ContentItem
**Location**: `apps/api/app/models.py:218-241`

Reusable content that can be posted to multiple accounts.

**Key Fields**:
```python
id: UUID
tenant_id: str
title: str
base_caption: str  # Main content text
media_urls: List[str]  # Images/videos
cta_type: str  # 'CallNow', 'BookOnline', 'LearnMore', 'None'
cta_url: str
status: str  # 'Idea' → 'Draft' → 'Needs Approval' → 'Scheduled' → 'Posted'
owner: str
```

**Purpose**: Stores the actual content that will be posted.

---

### PostInstance
**Location**: `apps/api/app/models.py:243-278`

A specific scheduled post linking a ContentItem to a ChannelAccount at a specific time.

**Key Fields**:
```python
id: UUID
tenant_id: str
content_item_id: UUID | None  # ⚠️ NULLABLE - null for planned slots
channel_account_id: UUID
scheduled_for: datetime | None
status: str  # 'Planned' | 'Draft' | 'Scheduled' | 'Posted' | 'Failed'
caption_override: str | None  # Per-account customization
```

**Unique Constraint**: `(tenant_id, channel_account_id, scheduled_for)` - prevents duplicate slots

**Planned Slot Characteristics**:
- `content_item_id = None`
- `status = 'Planned'`
- `scheduled_for` is set to a future datetime

---

## 🔄 Preloaded Posts (Planned Slots) Flow

### Step 1: Scheduler Trigger

**Manual Trigger** (Frontend):
- User clicks "📅 Top off 28 days" button
- Calls: `POST /api/v1/marketing/scheduler/topoff?tenant_id=h2o&days=28`
- Location: `apps/web/app/marketing/page.tsx:1262-1293`

**Automatic Trigger** (Background):
- Runs daily via APScheduler
- Function: `topoff_marketing_slots()` in `apps/api/app/core/tasks.py:16-39`
- Scheduled in `apps/api/app/main.py:170-172`

---

### Step 2: Scheduler Logic

**Entry Point**: `apps/api/app/api/marketing_scheduler.py:117-252`

**Process**:

1. **Get Active Accounts**:
   ```python
   SELECT * FROM channel_accounts 
   WHERE tenant_id = 'h2o' AND status = 'active'
   ```

2. **For Each Account**:
   - Call `compute_schedule_datetimes()` to calculate target datetimes
   - Query existing PostInstances in date range
   - Create missing slots

3. **Compute Schedule Datetimes** (`compute_schedule_datetimes()`):
   - Reads account config: `posts_per_week`, `schedule_timezone`, `schedule_times`
   - Calculates: `total_posts = posts_per_week * (days / 7)`
   - Distributes posts evenly across date range
   - Assigns times from `schedule_times` array (rotates if multiple)
   - Converts to UTC for storage

4. **Check Existing Instances**:
   - Query: `SELECT * FROM post_instances WHERE scheduled_for BETWEEN start AND end`
   - Round datetimes to minute precision for matching
   - Skip if:
     - Instance already exists at that datetime (idempotency)
     - Instance has `content_item_id` (has real content - don't overwrite)
     - Instance status is beyond 'Planned'/'Draft' (don't overwrite human work)

5. **Create Planned Slots**:
   ```python
   PostInstance(
       tenant_id=tenant_id,
       content_item_id=None,  # ⚠️ NULL for planned slots
       channel_account_id=account.id,
       scheduled_for=target_dt,
       status='Planned'
   )
   ```

6. **Bulk Insert & Commit**:
   - Uses `db.add_all()` for efficiency
   - Commits transaction
   - Returns summary: `{instances_created, instances_skipped, accounts_processed}`

---

### Step 3: Calendar Display

**API Endpoint**: `GET /api/v1/marketing/calendar?tenant_id=h2o&start_date=...&end_date=...`
**Location**: `apps/api/app/api/marketing.py:637-676`

**Process**:
1. Query PostInstances in date range
2. Use `joinedload()` to eagerly load `content_item` and `channel_account` relationships
3. Handle null `content_item` gracefully (planned slots)
4. Group by date: `{ "2024-12-22": [instance1, instance2, ...] }`
5. Serialize using Pydantic schema

**Frontend Display**: `apps/web/app/marketing/page.tsx:1620-1712`
- Planned slots show as: **"Needs content"** (italic, purple badge)
- Regular posts show: Content title + account name
- Clicking opens `PostInstanceDetailModal`

---

### Step 4: Adding Content to Planned Slot

**User Action**: Click planned slot → Click "Add Content" button

**Frontend Flow**: `apps/web/app/marketing/page.tsx:2740-2854`

1. **Open Edit Modal** (`EditPlannedSlotModal`):
   - User enters: title, base_caption
   - Submits form

2. **Create ContentItem**:
   ```javascript
   POST /api/v1/marketing/content-items
   {
     tenant_id: 'h2o',
     title: '...',
     base_caption: '...',
     status: 'Draft',
     owner: 'admin'
   }
   ```

3. **Link to PostInstance**:
   ```javascript
   PATCH /api/v1/marketing/post-instances/{instance_id}
   {
     content_item_id: newItem.id,
     status: 'Draft'  // Changes from 'Planned' to 'Draft'
   }
   ```

4. **Refresh Calendar**: Calls `loadCalendar()` to show updated slot

---

## 📝 Content Creation & Assignment

### Creating New Content (Not from Planned Slot)

**Flow**: `apps/web/app/marketing/page.tsx:1295-1382`

1. User fills form: title, caption, selects accounts, optional scheduled date
2. **Step 1**: Create ContentItem
3. **Step 2**: Create PostInstances for selected accounts
   - Uses bulk endpoint: `POST /api/v1/marketing/post-instances/bulk`
   - Creates one PostInstance per selected account
   - All link to same ContentItem

---

## 🔌 API Endpoints

### Scheduler Endpoints

**POST `/api/v1/marketing/scheduler/topoff`**
- **Purpose**: Create planned slots for next N days
- **Params**: `tenant_id` (required), `days` (default: 28)
- **Returns**: `{instances_created, instances_skipped, accounts_processed, window_start, window_end}`
- **Idempotent**: Safe to run multiple times (won't create duplicates)

### Calendar Endpoints

**GET `/api/v1/marketing/calendar`**
- **Purpose**: Get calendar view grouped by date
- **Params**: `tenant_id`, `start_date`, `end_date`
- **Returns**: `{ "2024-12-22": [PostInstance, ...], ... }`
- **Handles**: Planned slots (null content_item) gracefully

### Content Endpoints

**POST `/api/v1/marketing/content-items`**
- **Purpose**: Create new content
- **Body**: `{title, base_caption, status, owner, ...}`

**PATCH `/api/v1/marketing/content-items/{id}`**
- **Purpose**: Update existing content

### Post Instance Endpoints

**GET `/api/v1/marketing/post-instances`**
- **Purpose**: List post instances (with filters)

**POST `/api/v1/marketing/post-instances/bulk`**
- **Purpose**: Create multiple PostInstances from one ContentItem

**PATCH `/api/v1/marketing/post-instances/{id}`**
- **Purpose**: Update PostInstance (e.g., link content_item_id to planned slot)

---

## ⚙️ Background Automation

**Location**: `apps/api/app/core/tasks.py:16-39`

**Function**: `topoff_marketing_slots()`

**Schedule**: Daily (configured in `apps/api/app/main.py:170-172`)

**Process**:
1. Get all unique tenant_ids from channel_accounts
2. For each tenant:
   - Call `topoff_scheduler_logic(tenant_id, days=28, db=db)`
   - Log results
   - Handle errors per-tenant (doesn't fail entire job)

**Purpose**: Automatically maintain 28-day rolling horizon of planned slots.

---

## 🎨 Frontend Components

### Marketing Page
**Location**: `apps/web/app/marketing/page.tsx`

**Tabs**:
- **Calendar**: Shows scheduled posts (planned + with content)
- **Posts**: Lists all ContentItems
- **Trends**: Demand signals panel

### Calendar View
**Component**: `CalendarView()` (line 1051)

**Features**:
- Month/Week view toggle
- Displays planned slots as "Needs content"
- Click to open detail modal
- "Top off 28 days" button

### Post Instance Detail Modal
**Component**: `PostInstanceDetailModal()` (line 2578)

**Features**:
- Shows post details
- "Add Content" button for planned slots
- Opens `EditPlannedSlotModal` when clicked

### Edit Planned Slot Modal
**Component**: `EditPlannedSlotModal()` (line 2740)

**Features**:
- Form: title, base_caption
- Creates ContentItem
- Links to PostInstance
- Updates calendar on success

---

## 🔍 Troubleshooting

### Planned Slots Not Showing

**Check 1**: Active Channel Accounts
```sql
SELECT id, name, status, posts_per_week, schedule_times 
FROM channel_accounts 
WHERE tenant_id = 'h2o' AND status = 'active';
```
- Must have `status = 'active'`
- Should have `posts_per_week > 0`
- Should have `schedule_times` array set

**Check 2**: Run Topoff Manually
- Click "📅 Top off 28 days" button
- Check toast message: "Created X new slots, skipped Y existing"
- If "0 created", check console for errors

**Check 3**: Database Query
```sql
SELECT id, status, content_item_id, scheduled_for, channel_account_id 
FROM post_instances 
WHERE tenant_id = 'h2o' 
AND status = 'Planned' 
AND scheduled_for >= NOW()
ORDER BY scheduled_for;
```

**Check 4**: Calendar API Response
- Open DevTools → Network
- Reload marketing calendar
- Check `/marketing/calendar` response
- Should see instances with `status: "Planned"` and `content_item_id: null`

### Scheduler Not Running Automatically

**Check**: Background job configuration
- File: `apps/api/app/main.py:170-172`
- Should have APScheduler job configured
- Check logs for `topoff_marketing_slots` execution

### Content Not Linking to Planned Slot

**Check**: PostInstance update endpoint
- Verify `PATCH /marketing/post-instances/{id}` is called
- Check request body includes `content_item_id`
- Verify response status is 200

---

## 📈 Data Flow Summary

```
1. Scheduler (Manual/Auto)
   ↓
2. Get Active ChannelAccounts
   ↓
3. Compute Schedule Datetimes (based on posts_per_week, schedule_times)
   ↓
4. Check Existing PostInstances (idempotency check)
   ↓
5. Create Planned Slots (content_item_id = NULL, status = 'Planned')
   ↓
6. Calendar API Returns Planned Slots
   ↓
7. Frontend Displays "Needs content"
   ↓
8. User Clicks → Opens Modal
   ↓
9. User Adds Content → Creates ContentItem
   ↓
10. Links ContentItem to PostInstance (PATCH)
    ↓
11. Status Changes: 'Planned' → 'Draft'
    ↓
12. Calendar Refreshes → Shows Content Title
```

---

## 🔐 Key Constraints & Safety Features

1. **Idempotency**: Unique constraint `(tenant_id, channel_account_id, scheduled_for)` prevents duplicates
2. **No Overwrites**: Scheduler skips instances with real content (`content_item_id IS NOT NULL`)
3. **Status Protection**: Scheduler only modifies 'Planned'/'Draft' status instances
4. **Timezone Handling**: All datetimes stored in UTC, converted to account timezone for scheduling
5. **Error Handling**: Background jobs handle errors per-tenant (don't fail entire job)

---

## 📚 Related Files

**Backend**:
- `apps/api/app/models.py` - Data models
- `apps/api/app/api/marketing_scheduler.py` - Scheduler logic
- `apps/api/app/api/marketing.py` - Calendar & content endpoints
- `apps/api/app/core/tasks.py` - Background automation
- `apps/api/app/main.py` - APScheduler configuration
- `apps/api/app/schemas_marketing.py` - Pydantic schemas

**Frontend**:
- `apps/web/app/marketing/page.tsx` - Main marketing page
- `apps/web/components/ui/StatusBadge.tsx` - Status display

**Migrations**:
- `apps/api/alembic/versions/0015_add_marketing_scheduler.py` - Schema changes

---

## ✅ Verification Checklist

- [ ] At least one ChannelAccount with `status = 'active'`
- [ ] ChannelAccount has `posts_per_week > 0`
- [ ] ChannelAccount has `schedule_times` array set
- [ ] Topoff scheduler runs successfully (check toast/logs)
- [ ] Planned slots appear in calendar as "Needs content"
- [ ] Clicking planned slot opens detail modal
- [ ] "Add Content" button creates ContentItem and links to PostInstance
- [ ] Calendar refreshes after adding content
- [ ] Background job runs daily (check logs)

---

**Last Updated**: 2024-12-22
**Version**: 1.0

