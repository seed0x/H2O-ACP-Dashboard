# Failure Map - Plumbing Operations Platform

**Last Updated**: 2025-01-XX  
**Status**: ✅ **UPDATED - Current State Verified**

---

## Summary Statistics

- **Total Issues Documented**: 15
- **✅ FIXED Issues**: 8 (P0 API versioning issues resolved)
- **⚠️ REMAINING Issues**: 7
- **P0 (Critical)**: 0 remaining
- **P1 (High Priority)**: 4 remaining
- **P2 (Medium Priority)**: 3 remaining

---

## ✅ FIXED ISSUES (Verified)

### Fixed #1-5: API Versioning Mismatch ✅
**Status**: **FIXED** - All API calls now use `API_BASE_URL`

**What was fixed**:
- ✅ Signals endpoints: `Dataflow.tsx` and `Sidebar.tsx` now use `${API_BASE_URL}/signals/all`
- ✅ Marketing endpoints: All 19+ marketing API calls now use `${API_BASE_URL}/marketing/...`
- ✅ No relative `/api/` paths found in codebase
- ✅ PostDetailModal uses new `post-instances` endpoints (not old `content-posts`)

**Evidence**:
- `apps/web/components/Dataflow.tsx:44` - Uses `${API_BASE_URL}/signals/all`
- `apps/web/components/Sidebar.tsx:64` - Uses `${API_BASE_URL}/signals/all`
- `apps/web/app/marketing/page.tsx` - All fetch calls use `${API_BASE_URL}/marketing/...`
- No matches found for `fetch('/api/` or `axios.get('/api/` patterns

**Impact**: These were the most critical P0 issues blocking production. All resolved.

---

## ⚠️ REMAINING ISSUES

### Issue #1: Silent Error Handling in Analytics Page
**Priority**: P1  
**Area**: UI / Error Handling  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: Analytics page silently swallows errors, showing null/0 values without user notification.

**Location**: `apps/web/app/analytics/page.tsx:23-25`

**Code**:
```typescript
const [overviewRes, reviewsRes, performanceRes] = await Promise.all([
  axios.get(`${API_BASE_URL}/analytics/overview`, { headers, withCredentials: true }).catch(() => ({ data: null })),
  axios.get(`${API_BASE_URL}/analytics/reviews?days=30`, { headers, withCredentials: true }).catch(() => ({ data: null })),
  axios.get(`${API_BASE_URL}/analytics/performance?days=30`, { headers, withCredentials: true }).catch(() => ({ data: null }))
])
```

**Impact**: 
- Users see null/0 metrics with no indication something is wrong
- Errors logged to console but never shown to users
- Poor user experience

**Fix Required**:
- Replace silent catches with proper error handling
- Show user-friendly error messages (toast notifications or error banners)
- Log errors for debugging

---

### Issue #2: Silent Error Handling in Dashboard Overdue Endpoints
**Priority**: P1  
**Area**: UI / Error Handling  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: Dashboard silently catches errors on overdue endpoints, showing empty arrays.

**Location**: `apps/web/app/page.tsx:44-47`

**Code**:
```typescript
axios.get(`${API_BASE_URL}/jobs/overdue?tenant_id=all_county`, { headers, withCredentials: true }).catch(() => ({ data: [] })),
axios.get(`${API_BASE_URL}/service-calls/overdue?tenant_id=h2o`, { headers, withCredentials: true }).catch(() => ({ data: [] })),
axios.get(`${API_BASE_URL}/reviews/requests/overdue?tenant_id=h2o`, { headers, withCredentials: true }).catch(() => ({ data: [] })),
axios.get(`${API_BASE_URL}/recovery-tickets/overdue?tenant_id=h2o`, { headers, withCredentials: true }).catch(() => ({ data: [] }))
```

**Impact**:
- Overdue items may not display if endpoints fail
- No user notification of failures
- Silent failures mask broken endpoints

**Fix Required**:
- Add error logging
- Show user-visible error messages
- Verify overdue endpoints exist and work correctly

---

### Issue #3: AuthGuard Doesn't Validate Token with Backend
**Priority**: P1  
**Area**: Auth  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: AuthGuard only checks if token exists in localStorage, doesn't validate with backend.

**Location**: `apps/web/components/AuthGuard.tsx:10-28`

**Code**:
```typescript
useEffect(() => {
  const token = localStorage.getItem('token')
  
  if (pathname === '/login') {
    setIsChecking(false)
    return
  }
  
  if (!token) {
    router.replace('/login')
    return
  }
  
  // Token exists, allow access - NO VALIDATION!
  setIsChecking(false)
}, [pathname, router])
```

**Impact**:
- Invalid/expired tokens still allow page access
- User only sees error when making API call
- Security concern: expired tokens not immediately rejected

**Fix Required**:
- Add token validation endpoint call (e.g., `/users/me`)
- Validate token on page load/refresh
- Redirect to login if token invalid/expired

**Note**: Requires backend endpoint like `/users/me` to exist for validation.

---

### Issue #4: Hardcoded Tenant IDs Throughout Codebase
**Priority**: P1  
**Area**: Tenant Management  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: Multiple components hardcode tenant IDs instead of reading from user context.

**Locations**:
- `apps/web/app/page.tsx:42` - `tenant_id=h2o` for service calls
- `apps/web/app/page.tsx:41` - `tenant_id=all_county` for jobs
- `apps/web/components/Dataflow.tsx:44` - `tenant_id=h2o`
- `apps/web/components/Sidebar.tsx:64` - `tenant_id=h2o`
- `apps/web/app/marketing/page.tsx` - Multiple `tenant_id=h2o` hardcoded
- `apps/web/app/jobs/page.tsx:41` - `tenant_id=all_county` hardcoded

**Impact**:
- Users always see data for hardcoded tenant
- Cannot switch tenants
- Multi-tenant functionality doesn't work

**Fix Required**:
- Extract tenant_id from JWT token on login
- Store in user context/state
- Use tenant from context instead of hardcoded values
- Add tenant selector UI where appropriate

---

### Issue #5: Bids Page Tenant Selector Doesn't Reload Data
**Priority**: P2  
**Area**: UI  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: Changing tenant selector doesn't trigger data reload.

**Location**: `apps/web/app/bids/page.tsx:27-49`

**Code**:
```typescript
useEffect(()=>{
  async function load(){
    // ... load data ...
  }
  load()
}, []) // Empty dependency array - doesn't react to tenant changes
```

**Impact**:
- User changes tenant selector but data doesn't update
- Must click "Search" button to reload
- Poor UX

**Fix Required**:
- Add `tenant` (and other filter state) to `useEffect` dependency array
- OR call `searchNow()` when tenant changes

---

### Issue #6: Scoreboard Endpoint Doesn't Exist
**Priority**: P2  
**Area**: API / Marketing  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: ScoreboardView component calls `/marketing/scoreboard` endpoint that doesn't exist.

**Location**: 
- Frontend: `apps/web/app/marketing/page.tsx:2549`
- Backend: `apps/api/app/api/marketing.py` - **No scoreboard endpoint found**

**Code**:
```typescript
// Frontend
const response = await fetch(`${API_BASE_URL}/marketing/scoreboard?${params}`, {
  credentials: 'include'
})
```

**Impact**:
- Scoreboard view always shows empty/error state
- Feature is non-functional
- User confusion

**Fix Required**:
- **Option 1**: Implement `/marketing/scoreboard` endpoint in backend
- **Option 2**: Remove ScoreboardView component if feature not needed

**Recommendation**: Implement endpoint or remove feature - don't leave broken UI.

---

### Issue #7: Legacy Field Names in Marketing Form
**Priority**: P2  
**Area**: Data Model  
**Status**: ⚠️ **VERIFIED - Still Present**

**Problem**: Marketing channel accounts form uses legacy field names (`account_name`, `account_email`) in form state, though API correctly uses `name` and `login_email`.

**Location**: `apps/web/app/marketing/page.tsx:2806-2807, 2884-2885, 2947`

**Code**:
```typescript
// Form state uses legacy names
const [formData, setFormData] = useState({
  account_name: '',  // Should be 'name'
  account_email: '', // Should be 'login_email'
  // ...
})

// But API call correctly maps to new names
const requestBody = {
  name: formData.account_name,        // Mapping works but confusing
  login_email: formData.account_email // Mapping works but confusing
}

// Edit handler has defensive fallback
account_name: account.name || account.account_name || '', // Defensive but indicates uncertainty
```

**Impact**:
- Code confusion (mixing old and new field names)
- Defensive fallbacks indicate uncertainty
- Potential for bugs if API changes

**Fix Required**:
- Update form state to use `name` and `login_email` directly
- Remove defensive fallbacks once standardized
- Update all references to use consistent field names

---

## 🔍 ISSUES THAT NEED VERIFICATION

### Issue #8: Token Expiration Handling
**Priority**: P2  
**Area**: Auth  
**Status**: ⚠️ **NEEDS VERIFICATION**

**Problem**: JWT tokens expire after 8 hours with no refresh mechanism.

**Location**: `apps/api/app/api/router.py` - Cookie max_age set to 28800 (8 hours)

**Question**: Does frontend handle token expiration gracefully?
- Does it show error message?
- Does it redirect to login?
- Or does it just fail silently?

**Action Required**: Test token expiration flow and document behavior.

---

### Issue #9: Overdue Endpoints May Not Exist
**Priority**: P1  
**Area**: API  
**Status**: ⚠️ **NEEDS VERIFICATION**

**Problem**: Dashboard calls overdue endpoints but they may not be properly registered.

**Endpoints Called**:
- `/jobs/overdue?tenant_id=all_county`
- `/service-calls/overdue?tenant_id=h2o`
- `/reviews/requests/overdue?tenant_id=h2o`
- `/recovery-tickets/overdue?tenant_id=h2o`

**Action Required**: 
- Verify these endpoints exist in backend router
- Test with curl/Postman
- Check if they're under `/api/v1/overdue/...` prefix instead

---

## 📋 QUICK WIN CHECKLIST

### P1 - High Priority (User-Facing Issues)
- [ ] **Fix silent error handling** in analytics page (Issue #1)
- [ ] **Fix silent error handling** in dashboard overdue endpoints (Issue #2)
- [ ] **Add token validation** to AuthGuard (Issue #3)
- [ ] **Extract tenant from JWT** and use throughout app (Issue #4)
- [ ] **Verify overdue endpoints** exist and work (Issue #9)

### P2 - Medium Priority (Technical Debt)
- [ ] **Fix bids page** tenant selector reload (Issue #5)
- [ ] **Implement or remove** scoreboard feature (Issue #6)
- [ ] **Standardize field names** in marketing form (Issue #7)
- [ ] **Test token expiration** handling (Issue #8)

---

## 🎯 RECOMMENDATIONS

1. **Error Handling Standardization**: Create a centralized error handling utility that:
   - Logs errors to console
   - Shows user-friendly toast notifications
   - Handles network errors gracefully

2. **Tenant Management**: 
   - Extract tenant_id from JWT token on login
   - Store in React Context
   - Use context throughout app instead of hardcoded values

3. **API Wrapper**: Consider creating `marketingApi` wrapper similar to `reviewApi` for consistency.

4. **Testing**: Add integration tests to catch breaking changes when API evolves.

---

## 📝 NOTES

- **API Versioning**: ✅ All fixed - no relative paths found
- **Data Model Migration**: ✅ PostDetailModal uses new model correctly
- **Scoreboard**: ⚠️ Endpoint missing - needs implementation or removal
- **Error Handling**: ⚠️ Silent failures need user-visible error messages
- **Tenant Management**: ⚠️ Hardcoded values need dynamic tenant support

---

**Last Verification**: Codebase checked on 2025-01-XX  
**Next Review**: After fixes applied

