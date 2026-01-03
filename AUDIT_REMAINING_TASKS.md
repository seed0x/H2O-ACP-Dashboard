# 📋 Remaining Audit Tasks

**Last Updated:** After TypeScript `any` type elimination (January 2025)

---

## ✅ COMPLETED

1. ✅ **TypeScript `any` Types (#11)** - 96+ types eliminated across 13 major files
2. ✅ **Tenant ID Validation (#2)** - Added validation across API endpoints (completed in previous session)

---

## 🔴 CRITICAL PRIORITY (2 items)

### 1. **Hardcoded Development Passwords in Production Code**
- **Location:** `apps/api/app/main.py` (lines 32-33, 70-78)
- **Issue:** Hardcoded passwords (`admin121`, `max123`, `mikeal123`, etc.)
- **Risk:** Security vulnerability - passwords exposed in version control
- **Fix:** Remove hardcoded passwords, use environment variables

### 2. **Missing Tenant ID Validation** ✅ (Already fixed - verify if needed)
- Status: Completed in previous session, but may need verification

---

## 🟠 HIGH PRIORITY (6 items)

### 3. **N+1 Query Problem in Analytics Endpoint**
- **Location:** `apps/api/app/api/analytics.py` (lines 34-70)
- **Issue:** Loading all records into memory, then filtering in Python
- **Fix:** Move filtering to SQL WHERE clauses

### 4. **N+1 Query Problem in Review-to-Content Pipeline**
- **Location:** `apps/api/app/api/marketing.py` (lines 1717-1734)
- **Issue:** Loop with database queries inside
- **Fix:** Batch queries using `IN` clause

### 5. **Missing Database Indexes**
- **Location:** Multiple tables (jobs, service_calls, content_items, post_instances, channel_accounts)
- **Issue:** Frequently queried columns lack indexes
- **Fix:** Create migration to add indexes

### 6. **Hardcoded Tenant IDs in Frontend**
- **Location:** Multiple files (marketing/page.tsx, customers/[id]/page.tsx, etc.)
- **Issue:** Hardcoded `'h2o'` tenant ID instead of using tenant context
- **Fix:** Replace with `useTenant()` hook

### 7. **Print Statements in Production Code**
- **Location:** `apps/api/app/api/router.py` (lines 310, 586)
- **Issue:** `print()` statements instead of proper logging
- **Fix:** Replace with proper logging

### 8. **Missing Error Boundaries in React Components**
- **Location:** Multiple React components
- **Issue:** No error boundaries wrapping major page components
- **Fix:** Wrap major routes with ErrorBoundary component

---

## 🟡 MEDIUM PRIORITY (15 items)

### 9. **Missing Input Validation**
- Multiple API endpoints
- Add Pydantic validators

### 10. **Inefficient Date Filtering**
- **Location:** `apps/api/app/api/analytics.py` (line 39)
- **Fix:** Move filtering to SQL WHERE clauses

### 11. **Missing Transaction Management**
- Multiple CRUD operations
- Ensure all multi-step operations use transactions

### 12. **Unused/Dead Code**
- Multiple files
- Remove unused code, run linter

### 13. **Inconsistent Error Handling**
- Multiple files
- Standardize error response format

### 14. **Missing Rate Limiting on Critical Endpoints**
- Some API endpoints
- Apply rate limiting to all write endpoints

### 15. **Hardcoded Emojis in Content Templates**
- **Location:** `apps/api/app/api/marketing_scheduler.py`
- **Fix:** Remove emojis from templates

### 16. **Missing Audit Logging**
- Some CRUD operations
- Ensure all write operations call `write_audit()`

### Plus: Code quality improvements, architecture improvements, security hardening (items #21-40)

---

## 🔵 CODE QUALITY (From CODEBASE_AUDIT_REPORT.md)

### 17. **Duplicate IconWrapper Function (4 instances)**
- **Priority:** P1
- **Files:** service-calls/[id]/page.tsx, jobs/[id]/page.tsx, page.tsx, customers/[id]/page.tsx
- **Fix:** Create shared component `apps/web/components/ui/IconWrapper.tsx`

### 18. **Duplicate formatTime Function (2 instances)**
- **Priority:** P2
- **Files:** tech-schedule/page.tsx, TodaysSchedule.tsx
- **Fix:** Create shared utility `apps/web/lib/utils/dateFormat.ts`

### 19. **Console Logging**
- **Status:** Appears to be cleaned up (0 instances found in main files)
- **Note:** Verify all files

### 20. **TODO Comments (2 instances)**
- ErrorBoundary.tsx: Error tracking service integration
- WorkflowStepper.tsx: Photo upload implementation
- **Priority:** Low (acceptable TODOs for future)

---

## 📊 SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| Critical | 2 | 1 remaining (hardcoded passwords) |
| High | 6 | 0 completed, 6 remaining |
| Medium | 15+ | 1 completed (any types), 14+ remaining |
| Code Quality | 4 | 0 completed, 4 remaining |

**Total Remaining:** ~25+ items

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (This Week):
1. Remove hardcoded passwords (#1) - SECURITY CRITICAL
2. Fix N+1 queries (#3, #4) - PERFORMANCE CRITICAL
3. Add database indexes (#5) - PERFORMANCE CRITICAL

### High Priority (Next Week):
4. Replace hardcoded tenant IDs (#6)
5. Fix print statements (#7)
6. Add error boundaries (#8)

### Medium Priority:
7. Extract duplicate components (IconWrapper, formatTime)
8. Add input validation
9. Remove unused code
10. Standardize error handling

---

**Last Updated:** After TypeScript type safety improvements
