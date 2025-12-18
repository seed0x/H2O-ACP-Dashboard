# Dataflow & Actionable Signals Audit Report

## Executive Summary

This audit examines the codebase for:
1. **"New Content → Generate Posts" UX** implementation
2. **Dataflow actionable signals/cards** for Reviews, Marketing Execution, and Dispatch/Jobs

---

## 1. "New Content → Generate Posts" UX

### ✅ What Exists

**Files:**
- `apps/web/app/marketing/page.tsx` - PostsView component (lines 107-686)
- `apps/api/app/routes_marketing.py` - API endpoints for content creation

**Current Implementation:**
- **ContentItem Creation**: Form-based creation with title, caption, status, owner (lines 187-271)
- **PostInstance Generation**: After ContentItem creation, user selects accounts and creates PostInstances via `/post-instances/bulk-create` endpoint
- **Workflow**: 
  1. User clicks "+ New Post" button
  2. Fills form (title, content, accounts, schedule)
  3. System creates ContentItem
  4. System creates PostInstances for selected accounts
  5. User is redirected to posts list

**API Endpoints:**
- `POST /api/marketing/content-items` - Create ContentItem
- `POST /api/marketing/post-instances/bulk-create` - Create multiple PostInstances from ContentItem

### ⚠️ What's Partially Complete

**Missing Features:**
- No "Generate Posts" button or streamlined workflow
- No quick action to generate posts from existing ContentItem
- No bulk generation from multiple ContentItems
- No template-based generation
- Manual form-based process only (no wizard or guided flow)

### ❌ What's Missing

1. **"Generate Posts" Action Button** on ContentItem detail view
2. **Quick Generate Workflow** - One-click generation from ContentItem list
3. **Bulk Generation** - Generate posts for multiple ContentItems at once
4. **Template-Based Generation** - Generate posts from templates
5. **Guided Wizard** - Step-by-step content → posts generation flow

---

## 2. Dataflow Actionable Signals/Cards

### Current State: Basic Dashboard Only

**Files:**
- `apps/web/app/page.tsx` - Main dashboard (lines 7-622)
- `apps/web/components/NotificationCenter.tsx` - Notification system

**What Exists:**
- Basic dashboard with stat cards and overdue alerts
- Overdue items section showing counts
- Today's focus section
- Recent items lists

**What's Missing:**
- No dedicated "Dataflow" component
- No signal card system
- No actionable card components
- No unified signal aggregation

---

## 3. Reviews - Actionable Signals

### ✅ What Exists

**Files:**
- `apps/web/app/page.tsx` - Dashboard shows overdue review requests (lines 210-216)
- `apps/web/app/reviews/page.tsx` - Reviews page with review requests table
- `apps/web/app/review-requests/[id]/page.tsx` - Review request detail page
- `apps/api/app/api/reviews.py` - Review API endpoints
- `apps/api/app/api/recovery_tickets.py` - Recovery ticket endpoints

**Current Implementation:**
- **Dashboard Integration**: Shows count of overdue review requests (line 16, 59, 210-216)
- **Overdue Alerts**: Displays overdue review requests in dashboard alert section
- **Review Requests Page**: Full table view with status, customer info, actions
- **Quick Actions**: "Send Now" button for pending requests with email
- **Recovery Tickets**: Overdue recovery tickets shown in dashboard

**API Endpoints:**
- `GET /reviews/requests/overdue` - Get overdue review requests
- `GET /recovery-tickets/overdue` - Get overdue recovery tickets

### ⚠️ What's Partially Complete

**Missing Signal Types:**
- No signal cards for "Review requests pending send"
- No signal cards for "Reviews awaiting response"
- No signal cards for "Low-rated reviews needing attention"
- No signal cards for "Recovery tickets requiring action"
- No priority-based signal ordering

### ❌ What's Missing

1. **Signal Card Component** - Reusable card component for review signals
2. **Actionable Review Signals**:
   - "3 review requests ready to send"
   - "2 recovery tickets need follow-up"
   - "1 low-rated review needs response"
3. **Quick Actions from Signals** - Direct actions from signal cards
4. **Signal Aggregation Endpoint** - API endpoint to get all review-related signals
5. **Signal Priority System** - Priority-based signal ordering

---

## 4. Marketing Execution - Actionable Signals

### ✅ What Exists

**Files:**
- `apps/web/app/marketing/page.tsx` - Marketing module (2687 lines)
- `apps/web/app/marketing/page.tsx` - ScoreboardView (lines 1955-2231)
- `apps/api/app/routes_marketing.py` - Marketing API endpoints

**Current Implementation:**
- **Scoreboard**: Weekly accountability scoreboard showing owner metrics (lines 1955-2231)
- **Calendar View**: Calendar showing scheduled posts (lines 702-1139)
- **Posts View**: List of ContentItems with status (lines 107-686)
- **Overdue Drafts**: Scoreboard tracks overdue drafts (lines 310-333 in routes_marketing.py)

**API Endpoints:**
- `GET /api/marketing/scoreboard` - Weekly scoreboard data
- `GET /api/marketing/calendar` - Calendar view data
- `GET /api/marketing/content-items` - List content items
- `GET /api/marketing/post-instances` - List post instances

### ⚠️ What's Partially Complete

**Missing Signal Types:**
- No signal cards for "Posts needing approval"
- No signal cards for "Unscheduled posts"
- No signal cards for "Posts scheduled but not posted"
- No signal cards for "Failed posts requiring attention"
- No signal cards for "Overdue drafts"

### ❌ What's Missing

1. **Signal Card Component** - Reusable card for marketing signals
2. **Actionable Marketing Signals**:
   - "5 posts need approval"
   - "3 posts are unscheduled"
   - "2 posts failed to post"
   - "4 drafts are overdue"
   - "1 post needs manual posting"
3. **Marketing Signals API Endpoint** - Aggregate all marketing actionable items
4. **Quick Actions from Signals**:
   - "Approve All" from approval signals
   - "Schedule All" from unscheduled signals
   - "Retry Failed" from failed post signals
5. **Real-time Signal Updates** - Live updates for marketing signals

---

## 5. Dispatch/Jobs - Actionable Signals

### ✅ What Exists

**Files:**
- `apps/web/app/page.tsx` - Dashboard shows overdue jobs (lines 196-201, 231-249)
- `apps/web/app/jobs/page.tsx` - Jobs list page with quick actions
- `apps/web/app/service-calls/page.tsx` - Service calls page with quick actions
- `apps/api/app/api/overdue.py` - Overdue tracking endpoints

**Current Implementation:**
- **Dashboard Integration**: Shows overdue jobs count and list (lines 196-201, 231-249)
- **Today's Focus**: Shows jobs scheduled today (lines 275-358)
- **This Week**: Shows upcoming jobs this week (lines 360-438)
- **Quick Actions**: "Mark Complete" button on jobs/service calls
- **Overdue Tracking**: API endpoint for overdue jobs/service calls

**API Endpoints:**
- `GET /jobs/overdue` - Get overdue jobs
- `GET /service-calls/overdue` - Get overdue service calls

### ⚠️ What's Partially Complete

**Missing Signal Types:**
- No signal cards for "Jobs needing dispatch"
- No signal cards for "Service calls requiring scheduling"
- No signal cards for "Jobs without assigned tech"
- No signal cards for "High-priority items"
- No signal cards for "Jobs approaching deadline"

### ❌ What's Missing

1. **Signal Card Component** - Reusable card for dispatch signals
2. **Actionable Dispatch Signals**:
   - "3 jobs need dispatch"
   - "5 service calls need scheduling"
   - "2 jobs have no assigned tech"
   - "1 high-priority job needs attention"
   - "4 jobs approaching deadline"
3. **Dispatch Signals API Endpoint** - Aggregate all dispatch-related signals
4. **Quick Actions from Signals**:
   - "Dispatch All" from dispatch signals
   - "Assign Tech" from unassigned signals
   - "Schedule All" from scheduling signals
5. **Priority-Based Signals** - Priority ordering for dispatch signals

---

## Summary of Missing Components

### Components to Create

1. **SignalCard Component** (`apps/web/components/SignalCard.tsx`)
   - Reusable card for displaying actionable signals
   - Props: title, count, description, actions, priority, type

2. **Dataflow Component** (`apps/web/components/Dataflow.tsx`)
   - Container for all signal cards
   - Groups signals by category (Reviews, Marketing, Dispatch)
   - Handles signal aggregation and display

3. **Signal API Endpoints** (`apps/api/app/api/signals.py`)
   - `GET /signals/reviews` - Get all review-related signals
   - `GET /signals/marketing` - Get all marketing-related signals
   - `GET /signals/dispatch` - Get all dispatch-related signals
   - `GET /signals/all` - Get all signals aggregated

### Features to Implement

1. **"Generate Posts" Quick Action**
   - Add "Generate Posts" button to ContentItem detail view
   - Add bulk generation from ContentItem list
   - Create guided wizard for content → posts flow

2. **Review Signals**
   - Signal cards for pending review requests
   - Signal cards for recovery tickets
   - Signal cards for low-rated reviews

3. **Marketing Signals**
   - Signal cards for posts needing approval
   - Signal cards for unscheduled posts
   - Signal cards for failed posts
   - Signal cards for overdue drafts

4. **Dispatch Signals**
   - Signal cards for jobs needing dispatch
   - Signal cards for service calls needing scheduling
   - Signal cards for unassigned items
   - Signal cards for high-priority items

---

## Implementation Priority

### High Priority (Core Functionality)
1. SignalCard component
2. Dataflow component
3. Signal API endpoints
4. Marketing signals (posts needing approval, unscheduled posts)

### Medium Priority (Enhanced UX)
5. "Generate Posts" quick action
6. Review signals
7. Dispatch signals

### Low Priority (Nice to Have)
8. Bulk generation features
9. Template-based generation
10. Real-time signal updates

---

## Files to Create/Modify

### New Files
- `apps/web/components/SignalCard.tsx`
- `apps/web/components/Dataflow.tsx`
- `apps/api/app/api/signals.py`
- `apps/api/app/schemas.py` (add signal schemas)

### Files to Modify
- `apps/web/app/page.tsx` - Add Dataflow component
- `apps/web/app/marketing/page.tsx` - Add "Generate Posts" action
- `apps/api/app/api/router.py` - Include signals router
- `apps/web/app/marketing/page.tsx` - Add ContentItem detail "Generate Posts" button

