# Marketing Tab - Complete Explanation

## Overview: What This System Is Supposed To Do

**The Goal:** A simple system to schedule marketing posts across different social media accounts (Google My Business, Facebook, Instagram, Nextdoor) with:
1. **Scheduled slots** - Know what needs to be posted when
2. **Content types** - Different types of posts (ad content, team post, coupon, DIY, blog post)
3. **Per account** - Each account has its own schedule
4. **Approval process** - Posts go through approval before going live

---

## The Three Main Tabs

### 1. **Calendar Tab** (Main View)
**What it shows:** A calendar grid showing when posts are scheduled or planned

**How it works:**
- Shows posts as cards in calendar day cells
- **Planned slots** (dashed border) = Empty slots that need content filled in
- **Scheduled posts** (solid border) = Posts with content that are scheduled to go live
- Click any post/slot to see/edit details
- "Top off 28 days" button creates empty planned slots for the next 28 days

**Current Status Issues:**
- The system creates "Planned" slots (empty slots waiting for content)
- But there's NO approval workflow on PostInstance level yet (that's what we were about to add)
- Currently, ContentItem has approval workflow, but PostInstance doesn't

### 2. **Posts Tab** (Content Library)
**What it shows:** A list of all ContentItems (the actual content/posts)

**How it works:**
- Lists all content you've created (titles, captions, status)
- ContentItems are reusable templates
- One ContentItem can be scheduled to multiple accounts (becomes multiple PostInstances)
- You can create new posts, edit existing ones, filter by status

**What ContentItem Statuses Mean:**
- `Idea` - Just an idea, not written yet
- `Draft` - Content is being written
- `Needs Approval` - Ready for review
- `Scheduled` - Approved and scheduled
- `Posted` - Already published

### 3. **Accounts Tab**
**What it shows:** List of all channel accounts (e.g., "H2O Plumbing - Google My Business")

**How it works:**
- Shows each social media account you're posting to
- You can add/edit accounts
- Each account has settings like:
  - `posts_per_week` - How many posts per week (default: 3)
  - `schedule_times` - What time to post (e.g., ["09:00", "14:00"])
  - `brand_diet` - What types of content to post (e.g., 40% team posts, 20% coupons)

---

## The Data Model: Two Types of Objects

### **ContentItem** (The Content Template)
- **What it is:** The actual content - title, caption, images, etc.
- **Status:** Idea → Draft → Needs Approval → Scheduled → Posted
- **Purpose:** Reusable content that can be posted to multiple accounts
- **Example:** 
  - Title: "Summer Plumbing Tips"
  - Caption: "Stay cool this summer with these plumbing tips..."
  - Category: "DIY"

### **PostInstance** (The Scheduled Post)
- **What it is:** A specific scheduled time/account for a ContentItem
- **Current Status:** Planned → Draft → Scheduled → Posted → Failed
- **Purpose:** Represents "Post this ContentItem to Account X at Time Y"
- **Example:**
  - ContentItem: "Summer Plumbing Tips" (from above)
  - ChannelAccount: "H2O Plumbing - Google My Business"
  - Scheduled: "2025-01-20 09:00"
  - Status: "Scheduled"

**The Problem:** Currently PostInstance doesn't have "Needs Approval" or "Approved" statuses - so there's no approval workflow per scheduled post!

---

## The Workflow (How It's Supposed To Work)

### **Current Workflow (What Exists Now):**

1. **Create Planned Slots** (Top-off button)
   - Click "Top off 28 days"
   - System creates empty "Planned" PostInstances for each account based on their schedule
   - Each slot gets a `suggested_category` (ad_content, team_post, coupon, etc.)

2. **Fill Planned Slots** (Add Content)
   - Click a planned slot on calendar
   - Create new ContentItem OR assign existing ContentItem
   - PostInstance status changes from "Planned" → "Draft"

3. **Schedule Post**
   - PostInstance status: "Draft" → "Scheduled"
   - (Currently skips approval - this is the gap!)

4. **Post Goes Live**
   - PostInstance status: "Scheduled" → "Posted"
   - User marks it as posted manually

### **What You Want (With Approval):**

1. **Create Planned Slots** ✅ (works)
2. **Fill with Content** ✅ (works)
3. **Submit for Approval** ❌ (missing - should go: Draft → Needs Approval)
4. **Approver Reviews** ❌ (missing - should go: Needs Approval → Approved)
5. **Schedule Post** ❌ (should require Approved status)
6. **Post Goes Live** ✅ (works)

---

## What The "Top Off" Scheduler Does

**Purpose:** Automatically create planned slots so you always know what needs content

**How it works:**
1. Looks at each active account's settings:
   - `posts_per_week` (how many posts)
   - `schedule_times` (what times to post)
   - `brand_diet` (what types of content)

2. Calculates dates for next 28 days (or specified days)

3. Creates PostInstances with:
   - `status = "Planned"` (empty slot)
   - `suggested_category` (based on brand_diet)
   - `scheduled_for` (the date/time)
   - `content_item_id = NULL` (no content yet)

4. Skips dates that already have slots (idempotent)

**Example:**
- Account: "H2O Plumbing - GMB"
- Settings: 3 posts/week, times: ["09:00"], brand_diet: 40% team, 20% coupon, 20% DIY, 20% blog
- Result: Creates ~12 planned slots over 28 days, distributed by category

---

## The Console Errors (401 Unauthorized)

**What you're seeing:**
```
GET /api/v1/marketing/system-health?tenant_id=h2o [HTTP/3 401]
GET /api/v1/signals/all?tenant_id=h2o [HTTP/3 401]
GET /api/v1/notifications/unread-count [HTTP/3 401]
```

**What 401 means:** "Unauthorized" - The API is rejecting requests because authentication failed

**Why this happens:**
1. **Token expired** - Your login session expired
2. **Token missing** - Token not being sent with requests
3. **Token invalid** - Token format is wrong
4. **Backend auth issue** - Backend not accepting valid tokens

**How to check:**
- Open browser DevTools → Application/Storage → Local Storage
- Look for `token` key
- If missing or looks invalid, you need to log in again

**Why it's affecting marketing:**
- Marketing tab loads calendar, posts, accounts on page load
- If auth fails, these API calls fail
- You see empty calendar, can't create posts, etc.

---

## Summary: What's Working vs. What's Missing

### ✅ **What Works:**
- Creating ContentItems (the content templates)
- Creating PostInstances (scheduled posts)
- Calendar view showing planned slots and scheduled posts
- Top-off scheduler creating planned slots
- Content type categorization (ad_content, team_post, coupon, etc.)
- Per-account scheduling settings

### ❌ **What's Missing (Your Requirements):**
1. **Approval workflow on PostInstance**
   - Currently: Draft → Scheduled (no approval step)
   - Need: Draft → Needs Approval → Approved → Scheduled

2. **Reviewer field on PostInstance**
   - Track who approved each scheduled post
   - Currently only ContentItem has reviewer field

3. **Simple, clear workflow**
   - The system is complex with two separate objects (ContentItem + PostInstance)
   - You want each scheduled post to go through its own approval independently

### 🔧 **What Needs To Be Fixed:**
1. Add "Needs Approval" and "Approved" statuses to PostInstance
2. Add `reviewer` field to PostInstance model
3. Update frontend to show approval workflow
4. Fix 401 authentication errors (likely token issue)
5. Simplify the workflow so it's clearer how approval works

---

## The Core Issue You Described

> "I just need to be able to have a set schedule of type of content and what account and the approval process of posts but each thing to be its own object and go through approval process"

**Current State:**
- ✅ Set schedule of content types per account (scheduler does this)
- ✅ Each thing is its own object (ContentItem + PostInstance are separate)
- ❌ Approval process on each scheduled post (PostInstance approval missing)

**What needs to happen:**
- Keep ContentItem + PostInstance as separate objects ✅
- Add approval workflow to PostInstance (not just ContentItem)
- Each PostInstance should independently go through: Draft → Needs Approval → Approved → Scheduled → Posted

This way, even if the same ContentItem is scheduled to 3 accounts, each PostInstance (one per account) goes through its own approval independently.

