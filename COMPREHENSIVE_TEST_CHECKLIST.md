# Comprehensive Testing Checklist

This checklist ensures all routes, buttons, pages, and integrations work correctly.

## Prerequisites

1. ✅ API server running on `http://localhost:8000`
2. ✅ Web app running on `http://localhost:3000`
3. ✅ Database connected and migrations applied
4. ✅ Admin user exists (username: `admin`, password: `adminpassword`)

---

## 1. Authentication & Access Control

### Login Page (`/login`)
- [ ] Page loads without errors
- [ ] Can enter username and password
- [ ] Login button works
- [ ] Successful login redirects to dashboard
- [ ] Invalid credentials show error message
- [ ] Token is stored in localStorage after login
- [ ] Cannot access other pages without logging in (redirects to `/login`)

### Logout
- [ ] Logout button/functionality works (if implemented)
- [ ] After logout, cannot access protected pages
- [ ] Redirects to login page after logout

---

## 2. Dashboard (`/`)

- [ ] Page loads without errors
- [ ] Shows statistics cards:
  - [ ] Active Jobs count
  - [ ] Pending Service Calls count
  - [ ] Total Builders count
  - [ ] Completed This Week count
- [ ] Recent Jobs section displays jobs
- [ ] Recent Service Calls section displays service calls
- [ ] All numbers are accurate
- [ ] No console errors
- [ ] Sidebar navigation works

---

## 3. Jobs Page (`/jobs`)

### List View
- [ ] Page loads without errors
- [ ] Shows list of jobs
- [ ] Filter by tenant works (All County / H2O)
- [ ] Filter by status works
- [ ] Filter by builder works
- [ ] Search functionality works
- [ ] Pagination works (if implemented)
- [ ] Job cards/rows display correctly:
  - [ ] Builder name
  - [ ] Community
  - [ ] Lot number
  - [ ] Phase
  - [ ] Status
  - [ ] Address
  - [ ] Tech name (if available)

### Create Job
- [ ] "Create Job" button works (if implemented)
- [ ] Form fields are present:
  - [ ] Builder (dropdown)
  - [ ] Community
  - [ ] Lot number
  - [ ] Phase
  - [ ] Status
  - [ ] Address fields
  - [ ] Tech name
- [ ] Form validation works
- [ ] Submit creates job successfully
- [ ] Success message appears
- [ ] New job appears in list

### Job Detail Page (`/jobs/[id]`)
- [ ] Clicking a job navigates to detail page
- [ ] All job information displays correctly:
  - [ ] Builder name
  - [ ] Community
  - [ ] Lot number
  - [ ] Phase
  - [ ] Status
  - [ ] Address
  - [ ] Scheduled dates
  - [ ] Notes
  - [ ] Tech name
- [ ] Edit button works (if implemented)
- [ ] Update functionality works
- [ ] Back button/navigation works

---

## 4. Service Calls Page (`/service-calls`)

### List View
- [ ] Page loads without errors
- [ ] Shows list of service calls
- [ ] Filter by tenant works
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Service call cards/rows display correctly:
  - [ ] Customer name
  - [ ] Address
  - [ ] Issue description
  - [ ] Status
  - [ ] Phone number (if available)
  - [ ] Email (if available)

### Create Service Call
- [ ] "Create Service Call" button works (if implemented)
- [ ] Form fields are present:
  - [ ] Customer name
  - [ ] Phone
  - [ ] Email
  - [ ] Address fields
  - [ ] Issue description
  - [ ] Priority
  - [ ] Status
- [ ] Form validation works
- [ ] Submit creates service call successfully
- [ ] Success message appears
- [ ] New service call appears in list

### Service Call Detail Page (`/service-calls/[id]`)
- [ ] Clicking a service call navigates to detail page
- [ ] All service call information displays correctly
- [ ] Edit button works (if implemented)
- [ ] Update functionality works
- [ ] Back button/navigation works

---

## 5. Builders Page (`/builders`)

- [ ] Page loads without errors
- [ ] Shows list of builders
- [ ] Search functionality works
- [ ] Builder cards/rows display:
  - [ ] Builder name
  - [ ] Notes
  - [ ] Contact count (if shown)

### Create Builder
- [ ] "Create Builder" button works
- [ ] Form fields are present:
  - [ ] Name
  - [ ] Notes
- [ ] Form validation works
- [ ] Submit creates builder successfully
- [ ] New builder appears in list

### Builder Detail
- [ ] Clicking a builder shows details
- [ ] Builder contacts are listed (if applicable)
- [ ] Edit functionality works
- [ ] Update functionality works

---

## 6. Bids Page (`/bids`)

- [ ] Page loads without errors
- [ ] Shows list of bids
- [ ] Filter by tenant works
- [ ] Filter by builder works
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Bid cards/rows display correctly:
  - [ ] Project name
  - [ ] Builder name
  - [ ] Status
  - [ ] Date (if shown)

### Create Bid
- [ ] "Create Bid" button works
- [ ] Form fields are present
- [ ] Form validation works
- [ ] Submit creates bid successfully
- [ ] New bid appears in list

### Bid Detail Page (`/bids/[id]`)
- [ ] Clicking a bid navigates to detail page
- [ ] All bid information displays correctly
- [ ] Line items are shown (if applicable)
- [ ] Edit functionality works
- [ ] Update functionality works

---

## 7. Marketing Page (`/marketing`)

- [ ] Page loads without errors
- [ ] Shows marketing channels (if applicable)
- [ ] Shows content posts (if applicable)
- [ ] Create post functionality works (if implemented)
- [ ] All buttons and forms work correctly

---

## 8. Data Accuracy Tests

### Imported Data Verification
- [ ] All County jobs are visible:
  - [ ] Jobs show correct builder names
  - [ ] Community names are correct
  - [ ] Lot numbers are correct
  - [ ] Phases are correct (TO, PB, TRIM, etc.)
  - [ ] Addresses are correct
  - [ ] Tech names are extracted and shown (if available)
- [ ] H2O service calls are visible:
  - [ ] Customer names are correct (from subject line)
  - [ ] Addresses are correct
  - [ ] Phone numbers are extracted (if available)
  - [ ] Email addresses are extracted (if available)
- [ ] Data counts match migration results:
  - [ ] ~1 All County job
  - [ ] ~133 All County service calls
  - [ ] ~26 H2O service calls

---

## 9. API Integration Tests

### Run Automated Tests
```bash
cd apps/api
pytest tests/test_all_endpoints.py -v
```

Check that all tests pass:
- [ ] Authentication tests pass
- [ ] Builder CRUD tests pass
- [ ] Job CRUD tests pass
- [ ] Service Call CRUD tests pass
- [ ] Bid CRUD tests pass
- [ ] Authorization tests pass
- [ ] Data integrity tests pass

---

## 10. Error Handling

- [ ] Invalid API responses show user-friendly errors
- [ ] Network errors are handled gracefully
- [ ] 401 errors redirect to login
- [ ] 404 errors show appropriate messages
- [ ] 500 errors show appropriate messages
- [ ] Form validation errors are clear
- [ ] No unhandled promise rejections in console
- [ ] No React errors in console

---

## 11. Browser Console Checks

Open browser DevTools Console and verify:
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No API errors (except expected 401s when not logged in)
- [ ] No CORS errors
- [ ] No network errors

---

## 12. Performance Checks

- [ ] Pages load in < 2 seconds
- [ ] API responses are fast (< 500ms)
- [ ] No memory leaks (check over time)
- [ ] Smooth navigation between pages
- [ ] No lag when typing in forms

---

## 13. Cross-Browser Testing (if applicable)

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)

---

## 14. Mobile Responsiveness (if applicable)

- [ ] Pages are usable on mobile
- [ ] Forms are accessible
- [ ] Navigation works on mobile
- [ ] No horizontal scrolling

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Environment:** Development / Production

**Total Tests:** ______
**Passed:** ______
**Failed:** ______
**Skipped:** ______

**Critical Issues Found:**
1. 
2. 
3. 

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

