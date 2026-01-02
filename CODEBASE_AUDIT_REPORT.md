# Codebase Audit Report
**Date**: 2025-01-XX  
**Purpose**: Identify duplicate code, orphaned functions, and code quality issues similar to the marketing tab cleanup

---

## 🔴 Critical Issues Found

### 1. Duplicate `IconWrapper` Function (4 instances)
**Priority**: P1 - Code Duplication  
**Impact**: Maintenance burden, inconsistent behavior risk

**Locations**:
- `apps/web/app/service-calls/[id]/page.tsx:36`
- `apps/web/app/jobs/[id]/page.tsx:90`
- `apps/web/app/page.tsx:27`
- `apps/web/app/customers/[id]/page.tsx:23`

**Issue**: Identical function defined in 4 different files:
```typescript
function IconWrapper({ Icon, size = 20, color = 'var(--color-text-secondary)' }: { Icon: React.ComponentType<{ size?: number | string; color?: string }>, size?: number, color?: string }) {
  return <Icon size={size} color={color} />
}
```

**Recommendation**: 
- Create `apps/web/components/ui/IconWrapper.tsx`
- Export as reusable component
- Replace all 4 instances with import

---

### 2. Duplicate `formatTime` Function (2 instances)
**Priority**: P2 - Code Duplication  
**Impact**: Inconsistent formatting, maintenance burden

**Locations**:
- `apps/web/app/tech-schedule/page.tsx:48` - Returns 'No time' or 'Invalid time'
- `apps/web/components/TodaysSchedule.tsx:117` - Returns 'Time N/A'

**Issue**: Similar but slightly different implementations:
- `tech-schedule`: `formatTime(dateString: string | null)` - handles null
- `TodaysSchedule`: `formatTime(dateString: string)` - doesn't handle null

**Recommendation**:
- Create `apps/web/lib/utils/dateFormat.ts`
- Export unified `formatTime` function
- Handle all edge cases consistently
- Replace both instances

---

## ⚠️ Medium Priority Issues

### 3. Large File: `tech-schedule/page.tsx` (811 lines)
**Priority**: P2 - Code Organization  
**Impact**: Hard to maintain, potential for hidden issues

**Analysis**:
- Contains `ServiceCallCheckoffs` component (lines 519-840) - should be extracted
- Contains `formatTime` helper - should be in utils
- File is manageable but could be split

**Recommendation**:
- Extract `ServiceCallCheckoffs` to `apps/web/components/ServiceCallCheckoffs.tsx`
- Move `formatTime` to utils
- File should reduce to ~600 lines

---

### 4. Excessive Console Logging (41 instances)
**Priority**: P2 - Code Quality  
**Impact**: Production noise, potential security issues

**Files with console.log/error/warn**:
- `apps/web/app/marketing/page.tsx`: 14 instances
- `apps/web/app/page.tsx`: 10 instances
- `apps/web/app/bids/page.tsx`: 4 instances
- `apps/web/app/profile/page.tsx`: 2 instances
- `apps/web/app/builders/page.tsx`: 2 instances
- Plus 8 other files with 1-2 instances each

**Recommendation**:
- Replace `console.log` with proper error handling via `handleApiError` or `logError`
- Remove debug console.logs from production code
- Use proper logging service for production (already has TODO in ErrorBoundary)

---

### 5. TODO Comments (2 instances)
**Priority**: P3 - Technical Debt  
**Impact**: Low, but should be tracked

**Locations**:
- `apps/web/components/ErrorBoundary.tsx:30` - Error tracking service integration
- `apps/web/components/ui/WorkflowStepper.tsx:195` - Photo upload implementation

**Recommendation**:
- Track in project management tool
- Both are acceptable TODOs for future enhancements

---

## ✅ Good Practices Found

1. **No orphaned code blocks** found (after marketing cleanup)
2. **No duplicate function definitions** within same file
3. **Proper component separation** - marketing components are well-extracted
4. **Consistent error handling** - most files use `handleApiError` and `logError`

---

## 📋 Recommended Actions

### Immediate (P1)
1. ✅ **Create shared IconWrapper component**
   - File: `apps/web/components/ui/IconWrapper.tsx`
   - Replace 4 duplicate instances

### Short-term (P2)
2. ✅ **Create shared date formatting utilities**
   - File: `apps/web/lib/utils/dateFormat.ts`
   - Replace 2 duplicate `formatTime` functions
   
3. ✅ **Extract ServiceCallCheckoffs component**
   - File: `apps/web/components/ServiceCallCheckoffs.tsx`
   - Reduce `tech-schedule/page.tsx` size

4. ⚠️ **Clean up console.log statements**
   - Replace with proper error handling
   - Remove debug logs

### Long-term (P3)
5. ⚠️ **Track and address TODO comments**
   - Add to project backlog
   - Prioritize based on business needs

---

## 📊 Summary Statistics

- **Total Issues Found**: 5
- **Critical (P1)**: 1 (Duplicate IconWrapper)
- **Medium (P2)**: 3 (formatTime, large file, console.logs)
- **Low (P3)**: 1 (TODOs)
- **Files Requiring Changes**: ~15 files
- **Estimated Cleanup Time**: 2-3 hours

---

## 🎯 Comparison to Marketing Tab Issues

**Marketing Tab Had**:
- ~2100 lines of orphaned/duplicate code
- 3 unused components
- Unused imports
- Syntax errors from orphaned code

**Current Codebase Has**:
- ✅ No orphaned code blocks
- ✅ No unused components
- ⚠️ 4 duplicate helper functions (IconWrapper)
- ⚠️ 2 duplicate utility functions (formatTime)
- ⚠️ 41 console.log statements (should use proper logging)

**Conclusion**: The codebase is in much better shape than the marketing tab was. The issues found are minor code duplication and code quality improvements, not structural problems.

