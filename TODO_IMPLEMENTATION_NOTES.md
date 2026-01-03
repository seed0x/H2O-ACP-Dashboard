# TODO Implementation Notes

## 1. Error Tracking Service Integration (ErrorBoundary)

**Status:** ✅ Enhanced with integration-ready code

**Location:** `apps/web/components/ErrorBoundary.tsx`

**Implementation:**
- Enhanced error logging with structured error context
- Added comments showing how to integrate Sentry or LogRocket
- Errors are logged via console.error in development
- Ready for error tracking service integration when DSN/credentials are available

**Next Steps (when ready to integrate):**
1. Install error tracking SDK (e.g., `npm install @sentry/react` or `npm install logrocket`)
2. Initialize in `apps/web/app/layout.tsx` or a config file
3. Uncomment the appropriate integration code in `ErrorBoundary.tsx`
4. Add environment variable for DSN/credentials (e.g., `NEXT_PUBLIC_SENTRY_DSN`)

**Note:** Error tracking services typically require:
- Account setup and DSN/API key
- SDK installation and initialization
- Environment variable configuration
- Optional: Source maps for better error reporting

---

## 2. Photo Upload in WorkflowStepper

**Status:** ⚠️ Requires backend endpoint implementation

**Location:** `apps/web/components/ui/WorkflowStepper.tsx`

**Current State:**
- Photo upload UI exists (file input, preview grid, remove functionality)
- Currently uses placeholder URLs
- Saves `paperwork_photo_urls` array to workflow via PATCH endpoint

**Backend Requirements:**
The backend needs a file upload endpoint for service call paperwork photos. Currently, the workflow endpoint accepts `paperwork_photo_urls` as an array of strings, but there's no upload endpoint to generate these URLs.

**Recommended Implementation:**

### Option A: Reuse Marketing Media Upload Endpoint
If the marketing media upload endpoint can handle service call photos:
1. Use `marketingApi.uploadMedia()` from `apps/web/lib/api/marketing.ts`
2. Upload files and get URLs
3. Store URLs in `paperwork_photo_urls` array

**Pros:** Reuses existing infrastructure
**Cons:** May not be semantically correct (marketing vs. service calls)

### Option B: Create Service Call-Specific Upload Endpoint
Create a new endpoint: `POST /service-calls/{id}/workflow/upload-paperwork`

**Implementation Steps:**
1. Backend: Add upload endpoint in `apps/api/app/api/service_call_workflow.py`
2. Frontend: Create upload function similar to `marketingApi.uploadMedia()`
3. Frontend: Replace `handlePhotoUpload` in `WorkflowStepper.tsx` to:
   - Upload files via new endpoint
   - Get URLs from response
   - Update `paperworkPhotos` state with URLs
   - Save to workflow via existing PATCH endpoint

**Recommended:** Option B for better separation of concerns

---

## Summary

1. **ErrorBoundary:** ✅ Enhanced and ready for error tracking service integration
2. **Photo Upload:** ⚠️ Requires backend file upload endpoint implementation

Both TODOs have been addressed to the extent possible with current infrastructure. Error tracking is integration-ready, and photo upload is documented with implementation recommendations.

