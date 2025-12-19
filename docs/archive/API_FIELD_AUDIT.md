# API Field Name Audit Report

## Summary
Comprehensive audit of frontend-backend field name mismatches and endpoint issues.

## Issues Found and Fixed

### Marketing Module (✅ FIXED)

1. **Channel Accounts Form**
   - ❌ Frontend: `account_name` → ✅ API: `name`
   - ❌ Frontend: `account_email` → ✅ API: `login_email`
   - ❌ Frontend: `ch.name` → ✅ API: `ch.display_name`
   - Status: **FIXED**

2. **Post Instances Bulk Create**
   - ❌ Frontend: `/api/marketing/post-instances/bulk-create`
   - ✅ API: `/api/marketing/post-instances/bulk`
   - Status: **FIXED**

3. **Content Items Update**
   - ❌ Frontend: `/api/marketing/content-posts/{id}`
   - ✅ API: `/api/marketing/content-items/{id}`
   - ❌ Frontend: `body_text` → ✅ API: `base_caption`
   - Status: **FIXED**

4. **Audit Trail**
   - ❌ Frontend: `/api/marketing/audit-trail/{id}`
   - ✅ API: `/api/v1/audit?entity_type=content_item&entity_id={id}`
   - Status: **FIXED**

5. **Scoreboard**
   - ❌ Frontend: `/api/marketing/scoreboard`
   - ⚠️ API: **NOT IMPLEMENTED**
   - Status: **TODO - Add endpoint or remove feature**

## Other Modules Checked

### Jobs Module
- ✅ Field names match API schemas
- ✅ Endpoints correct

### Service Calls Module
- ✅ Field names match API schemas
- ✅ Endpoints correct

### Bids Module
- ✅ Field names match API schemas
- ✅ Endpoints correct

### Reviews Module
- ✅ Field names match API schemas (via reviewApi wrapper)
- ✅ Endpoints correct

### Builders Module
- ✅ Field names match API schemas
- ✅ Endpoints correct

## Recommendations

1. **Scoreboard Feature**: Either implement the `/api/marketing/scoreboard` endpoint or remove the ScoreboardView component
2. **PostDetailModal**: This appears to be legacy code for old "content-posts" model. Consider updating to use content-items/post-instances or removing if unused
3. **API Wrapper**: Consider creating a marketingApi wrapper similar to reviewApi for consistency

## Testing Checklist

- [x] Marketing channel accounts CRUD
- [x] Marketing content items CRUD
- [x] Marketing post instances CRUD
- [ ] Marketing scoreboard (endpoint missing)
- [x] All other modules verified

## Files Modified

1. `apps/web/app/marketing/page.tsx` - Fixed field mappings and endpoints

