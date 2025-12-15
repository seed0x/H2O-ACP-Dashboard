# Marketing Content Calendar - MVP v1

## Overview
The Marketing Content Calendar is a centralized tool for planning, scheduling, and tracking marketing posts across multiple social media channels. Built for H2O Plumbers, it enables office staff and owners to coordinate content strategy and maintain consistent brand presence.

## Features

### 1. Posts Management
- **Create & Edit Posts**: Full CRUD operations for marketing posts
- **Status Workflow**: Posts progress through defined stages:
  - `Idea` → `Draft` → `Needs_Approval` → `Approved` → `Scheduled` → `Posted`
  - Also supports: `Failed`, `Canceled`
- **Multi-Channel Targeting**: Assign posts to one or multiple channels
- **Scheduling**: Set future publish dates/times
- **Filtering & Search**: Filter by status, channel, owner, or search by text
- **Metadata**: Tags (repipe, water_heater, drain, etc.), target areas, source insights, CTA types

### 2. Calendar View
- **Week View**: 7-day grid showing scheduled posts
- **Month View**: Toggle between week and month perspectives (UI ready, backend supports both)
- **Visual Status**: Color-coded status badges for quick scanning
- **Today Highlight**: Current day highlighted for context
- **Navigation**: Previous/Next week buttons and "Today" quick jump
- **At-a-Glance Info**: Each calendar card shows:
  - Post title
  - Target channels (📍 GBP, Facebook, etc.)
  - Owner (👤 name)
  - Status badge (Draft, Scheduled, Posted, etc.)
- **Click to Edit**: Click any calendar card to open full detail modal

### 3. Channel Accounts Management
- **Account Registry**: Centralized list of where you post (GBP, Facebook, Instagram, Nextdoor)
- **Security-First**: Stores credential vault references only—no plain-text passwords
- **OAuth Status**: Shows which accounts are auto-post ready vs. manual-only
- **Account Details**: Name, email, channel type, vault reference
- **CRUD Operations**: Add new accounts, delete unused ones

## Supported Channels
1. **Google Business Profile (GBP)** - MVP auto-post target
2. **Facebook Page** - Manual/future auto-post
3. **Instagram Business** - Manual/future auto-post
4. **Nextdoor Business** - Manual/future auto-post

## User Workflows

### Creating a New Post
1. Navigate to **Marketing → Posts**
2. Click **+ New Post**
3. Fill in:
   - Title (required)
   - Content (required)
   - Scheduled date/time (optional)
   - Target channels (checkboxes)
4. Click **Create Post**
5. Post starts in `Draft` status

### Viewing the Week's Schedule (Answers: What? Who? Status?)
1. Navigate to **Marketing → Calendar**
2. **See at a glance** for each post:
   - **WHAT**: Post title
   - **WHO**: Owner name (👤)
   - **STATUS**: Color-coded badge (Draft/Scheduled/Posted)
   - **WHERE**: Channel icons (📍 GBP, Facebook, etc.)
3. Use **Previous/Next** to navigate weeks
4. Click **Today** to return to current week
5. **Click any post card** to open full detail/edit modal

### Managing Channel Accounts
1. Navigate to **Marketing → Accounts**
2. Click **+ Add Account** to register new channel
3. Fill in:
   - Channel (GBP, Facebook, Instagram, Nextdoor)
   - Account Name (e.g., "H2O Plumbers GBP")
   - Account Email
   - Credential Vault Reference (e.g., "1Password: Business/H2O GBP Login")
4. Click **Save Account**
5. Account appears in list with OAuth status badge

### Manual Posting Workflow
1. Draft post in system with all content ready
2. Change status to `Scheduled` when approved
3. At scheduled time, manually log into target channel
4. Copy content from system
5. Post to channel
6. Return to system, **click post in calendar or table**
7. Click **"✓ Mark Posted"** button (or **"× Mark Failed"** if it didn't work)
8. Post status updates automatically

### Auto-Posting (GBP - Planned)
1. Configure channel account with OAuth credentials
2. System shows "✓ Auto-post ready" badge
3. Create post, select GBP channel, schedule date
4. Background worker publishes automatically at scheduled time
5. Status updates to `Posted` or `Failed` with error details

## Technical Architecture

### Database Schema
- **marketing_channels**: Static list of supported channels
- **channel_accounts**: WHERE we post (tenant-specific accounts)
- **content_posts**: The calendar items/posts
- **publish_jobs**: Tracks auto-publish attempts and results

### API Endpoints
```
GET    /api/marketing/channels                     # List available channels
GET    /api/marketing/channel-accounts             # List configured accounts
POST   /api/marketing/channel-accounts             # Add new account
DELETE /api/marketing/channel-accounts/{id}        # Remove account
GET    /api/marketing/content-posts                # List posts (w/ filters)
POST   /api/marketing/content-posts                # Create new post
PATCH  /api/marketing/content-posts/{id}           # Update post
DELETE /api/marketing/content-posts/{id}           # Delete post
GET    /api/marketing/calendar                     # Calendar view (grouped by date)
POST   /api/marketing/content-posts/{id}/mark-posted   # Mark as posted (future)
POST   /api/marketing/content-posts/{id}/mark-failed   # Mark as failed (future)
```

All endpoints require `tenant_id=h2o` parameter.

### Frontend Routes
- `/marketing?tab=posts` - Posts list and management
- `/marketing?tab=calendar` - Calendar week view
- `/marketing?tab=accounts` - Channel accounts

### Security
- **No Plain-Text Passwords**: All credentials stored via vault references
- **Audit Logging**: All CRUD operations logged with user, timestamp, changes
- **OAuth Token Storage**: Future OAuth tokens stored in `oauth_token_ref` field, not raw tokens
- **Tenant Isolation**: All queries scoped to `tenant_id`

## Deployment & Operations

### Running Migrations
```bash
# Using Docker
make migrate

# Or directly (if Python environment set up)
cd apps/api
alembic upgrade head
```

### Seeding Initial Data
Marketing channels (GBP, Facebook, Instagram, Nextdoor) are automatically seeded via migration `0004_seed_marketing_channels.py`.

### Starting Development Environment
```bash
# Start all services (API + Web + DB)
make dev
```

### Accessing the Module
1. Navigate to http://localhost:3000 (or your deployment URL)
2. Log in to ops dashboard
3. Click **Marketing** in sidebar (calendar icon)
4. Start creating content!

## Mobile Responsiveness
- All views optimized for phone screens (iPhone-sized)
- Calendar grid adapts to smaller screens
- Modal forms scroll on small devices
- Touch-friendly tap targets

## Future Enhancements (Post-MVP)
- [x] ~~Mark Posted/Failed buttons in post detail view~~ ✅ COMPLETE
- [x] ~~Full post edit modal with all fields (tags, CTA, media)~~ ✅ COMPLETE
- [ ] Image upload and storage for posts
- [ ] GBP auto-publish integration
- [ ] Facebook/Instagram OAuth and auto-publish
- [ ] Nextdoor OAuth and auto-publish
- [ ] Analytics dashboard (impressions, clicks, engagement)
- [ ] Bulk actions (schedule multiple posts at once)
- [ ] Template library (reusable post templates)
- [ ] Approval workflow notifications
- [ ] Calendar export (iCal format)

## Known Limitations
- **Manual Publishing**: All channels require manual posting (auto-publish worker not implemented yet)
- **No Media Upload**: Text-only posts (add media URL reference in post, upload separately in each channel)
- **Basic Filters**: No date range picker yet (use search)
- **Single Tenant**: Currently hardcoded to 'h2o' tenant
- **No Push Notifications**: Must check dashboard for status updates
- **Tags/CTA**: Fields exist in database but not exposed in create modal (can edit in post detail)

## Support & Troubleshooting

### Posts Not Showing
- Verify database migrations ran successfully
- Check browser console for API errors
- Ensure `tenant_id=h2o` in API requests

### Can't Create Posts
- Verify at least one channel account exists
- Check required fields (title, body_text)
- Ensure API service is running

### Calendar Empty
- Verify posts have `scheduled_for` dates
- Check date range (API fetches ±30 days from current week)
- Try navigating to different weeks

### Account Creation Fails
- Verify channel exists in `marketing_channels` table
- Ensure email format is valid
- Check for duplicate account names

## Contributing
When adding new features:
1. Update migrations for schema changes
2. Add API routes with audit logging
3. Update frontend views
4. Test mobile responsiveness
5. Update this documentation

---

**Version**: 1.0  
**Last Updated**: 2025  
**Module Status**: ✅ MVP Complete - Ready for Use
