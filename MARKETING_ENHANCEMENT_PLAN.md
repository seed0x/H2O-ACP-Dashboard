# Marketing Tab Enhancement Plan
**Goal**: Answer "What should we do today that increases calls in 30–90 days?"

## Feasibility Assessment

✅ **YES - This is very feasible with current codebase**

The existing architecture is well-structured:
- Clean separation: `ContentItem` (reusable) + `PostInstance` (scheduled)
- `ChannelAccount` already links to `MarketingChannel` (can identify GBP)
- `MediaAsset` exists (just needs tags)
- Review system exists (can link to content)
- Migration system is solid (idempotent patterns established)

## Implementation Plan

### Tier 1 - High Impact (Implement First)

#### 1. Local SEO Content Planner
**New Table**: `local_seo_topics`
```sql
- id (UUID)
- tenant_id (TEXT)
- service_type (TEXT) -- e.g., "Water Heater Repair"
- city (TEXT) -- e.g., "Vancouver WA"
- status (TEXT) -- 'not_started', 'in_progress', 'published', 'needs_update'
- last_posted_at (TIMESTAMP)
- last_post_instance_id (UUID, FK to post_instances)
- target_url (TEXT, nullable) -- Link to landing page if exists
- notes (TEXT, nullable)
- created_at, updated_at
```

**Integration**:
- Link `ContentItem.target_city` + `ContentItem.content_category` to topics
- Auto-create topic when content posted with city+service
- Dashboard shows coverage gaps

**Files to Create/Modify**:
- `apps/api/app/models.py` - Add `LocalSEOTopic` model
- `apps/api/app/schemas.py` - Add schemas
- `apps/api/app/crud.py` - Add CRUD operations
- `apps/api/app/api/marketing.py` - Add endpoints
- `apps/api/alembic/versions/0025_add_local_seo_topics.py` - Migration
- `apps/web/app/marketing/local-seo/page.tsx` - New page component

#### 2. Offer/Promo Manager (with Website Coupon Integration)
**New Table**: `offers`
```sql
- id (UUID)
- tenant_id (TEXT)
- title (TEXT) -- e.g., "Spring Plumbing Special"
- description (TEXT)
- service_type (TEXT, nullable) -- e.g., "Water Heater", "Drain Cleaning"
- valid_from (DATE)
- valid_to (DATE)
- discount_type (TEXT) -- 'percentage', 'fixed_amount', 'free_service'
- discount_value (NUMERIC, nullable)
- terms (TEXT, nullable)
- is_active (BOOLEAN)
- coupon_code (TEXT, nullable) -- Code for website redemption
- website_url (TEXT, nullable) -- Link to coupon landing page
- sync_source (TEXT, nullable) -- 'manual', 'website_file', 'api_sync'
- external_id (TEXT, nullable) -- ID from website system if synced
- created_at, updated_at
```

**Website Integration Strategy**:
1. **Option A - File Sync** (if website file is accessible):
   - Add endpoint: `POST /api/v1/marketing/offers/sync-from-file`
   - Reads coupon file from website codebase
   - Creates/updates offers in database
   - Can be scheduled or manual trigger

2. **Option B - API Sync** (if website has API):
   - Add endpoint: `POST /api/v1/marketing/offers/sync-from-website`
   - Website calls this endpoint when coupons change
   - Or scheduled job pulls from website API

3. **Option C - Shared Database** (if website uses same DB):
   - Website writes to `offers` table directly
   - Marketing system reads from same table
   - No sync needed

**Integration**:
- Add `offer_id` (UUID, nullable) to `ContentItem`
- Posts reference offer, don't recreate it
- Filter: "What promos are active right now?"
- Auto-link to website coupon page via `website_url`
- Show coupon code in post if available

**Files to Create/Modify**:
- `apps/api/app/models.py` - Add `Offer` model
- `apps/api/app/models.py` - Add `offer_id` to `ContentItem`
- `apps/api/app/schemas.py` - Add schemas
- `apps/api/app/crud.py` - Add CRUD operations
- `apps/api/app/api/marketing.py` - Add endpoints
- `apps/api/alembic/versions/0026_add_offers.py` - Migration
- `apps/web/app/marketing/offers/page.tsx` - New page component
- `apps/web/app/marketing/page.tsx` - Add offer selector to post creation

#### 3. GBP-Specific Content Tracking
**Modify**: `PostInstance` table
```sql
-- Add columns:
- gbp_post_type (TEXT, nullable) -- 'update', 'offer', 'event', 'whats_new'
- gbp_cta_type (TEXT, nullable) -- 'call', 'book', 'learn_more', 'order_online'
- gbp_location_targeting (TEXT, nullable) -- City/area if applicable
```

**Integration**:
- Only show these fields when `channel_account.channel.key = 'google_business_profile'`
- Validate GBP-specific requirements

**Files to Modify**:
- `apps/api/app/models.py` - Add fields to `PostInstance`
- `apps/api/app/schemas.py` - Add fields to schemas
- `apps/api/alembic/versions/0027_add_gbp_fields.py` - Migration
- `apps/web/app/marketing/page.tsx` - Conditional GBP fields in post editor

### Tier 2 - Medium Effort

#### 4. Content Mix Guardrails
**New Table**: `content_mix_tracking`
```sql
- id (UUID)
- tenant_id (TEXT)
- channel_account_id (UUID, FK)
- week_start_date (DATE)
- educational_count (INTEGER, default 0)
- authority_count (INTEGER, default 0)
- promo_count (INTEGER, default 0)
- local_relevance_count (INTEGER, default 0)
- target_educational (INTEGER, default 2)
- target_authority (INTEGER, default 1)
- target_promo (INTEGER, default 1)
- target_local (INTEGER, default 1)
- created_at, updated_at
```

**Integration**:
- Auto-calculate from `PostInstance` + `ContentItem.content_category`
- Show weekly dashboard with planned vs actual
- Warn when over-posting promos or under-posting authority

**Files to Create/Modify**:
- `apps/api/app/models.py` - Add `ContentMixTracking` model
- `apps/api/app/crud.py` - Add calculation logic
- `apps/api/app/api/marketing.py` - Add endpoints
- `apps/api/alembic/versions/0028_add_content_mix_tracking.py` - Migration
- `apps/web/app/marketing/page.tsx` - Add content mix dashboard widget

#### 5. Media Library with Intent Tags
**Modify**: `MediaAsset` table
```sql
-- Add column:
- intent_tags (ARRAY(TEXT)) -- ['before_after', 'crew', 'job_site', 'emergency', 'water_heater', 'drain', 'sewer']
```

**Integration**:
- Tag media when uploading
- Filter media by tags when creating posts
- Show relevant photos when clicking planned post

**Files to Modify**:
- `apps/api/app/models.py` - Add `intent_tags` to `MediaAsset`
- `apps/api/app/schemas.py` - Add to schemas
- `apps/api/alembic/versions/0029_add_media_intent_tags.py` - Migration
- `apps/web/components/marketing/PhotoUpload.tsx` - Add tag selector
- `apps/web/app/marketing/page.tsx` - Filter media by tags

### Tier 3 - Nice to Have

#### 6. Review-to-Content Pipeline
**Modify**: `Review` table
```sql
-- Add column:
- can_be_content (BOOLEAN, default false)
- content_item_id (UUID, nullable, FK to content_items)
```

**Integration**:
- "Flag for content" button on reviews page
- One-click "Turn into post" creates ContentItem + PostInstance
- Auto-generates quote post format

**Files to Modify**:
- `apps/api/app/models.py` - Add fields to `Review`
- `apps/api/app/crud.py` - Add review-to-content conversion
- `apps/api/app/api/reviews.py` - Add endpoint
- `apps/api/alembic/versions/0030_add_review_content_pipeline.py` - Migration
- `apps/web/app/reviews/page.tsx` - Add "Turn into post" button

#### 7. Seasonal/Event Calendar Overlay
**New Table**: `seasonal_events`
```sql
- id (UUID)
- tenant_id (TEXT)
- event_type (TEXT) -- 'freeze', 'heat_wave', 'holiday', 'city_event'
- name (TEXT) -- e.g., "Vancouver Freeze Warning"
- start_date (DATE)
- end_date (DATE)
- city (TEXT, nullable)
- content_suggestions (TEXT, nullable) -- Suggested content ideas
- created_at, updated_at
```

**Integration**:
- Overlay on calendar view
- Suggest preventative content before events
- Auto-create planned slots for seasonal content

**Files to Create/Modify**:
- `apps/api/app/models.py` - Add `SeasonalEvent` model
- `apps/api/app/crud.py` - Add CRUD operations
- `apps/api/app/api/marketing.py` - Add endpoints
- `apps/api/alembic/versions/0031_add_seasonal_events.py` - Migration
- `apps/web/app/marketing/page.tsx` - Add calendar overlay

## Architecture Principles

✅ **No God Files**: Each feature gets its own model, CRUD, and API endpoints
✅ **Clean Separation**: Business logic in `crud.py`, API in `api/marketing.py`, UI in separate components
✅ **Idempotent Migrations**: All migrations use `IF NOT EXISTS` patterns
✅ **Proper Relationships**: Foreign keys with proper cascades
✅ **Type Safety**: Full Pydantic schemas for all operations

## Implementation Order

1. **Phase 1** (Tier 1 - Core Features):
   - Local SEO Topics
   - Offers
   - GBP Fields

2. **Phase 2** (Tier 2 - Quality of Life):
   - Content Mix Tracking
   - Media Intent Tags

3. **Phase 3** (Tier 3 - Advanced):
   - Review-to-Content Pipeline
   - Seasonal Events

## Estimated Effort

- **Phase 1**: ~8-10 hours (database + API + basic UI)
- **Phase 2**: ~4-6 hours (enhancements to existing)
- **Phase 3**: ~4-6 hours (nice-to-have features)

**Total**: ~16-22 hours for complete implementation

## Next Steps

1. Review and approve plan
2. Start with Phase 1 (Tier 1)
3. Test each feature before moving to next
4. Deploy incrementally

