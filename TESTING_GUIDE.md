# Testing Guide for P1 Improvements

This guide provides step-by-step instructions for testing all P1 improvements.

---

## Prerequisites

1. **Docker and Docker Compose** installed
2. **Python 3.11+** (for local testing if not using Docker)
3. **PostgreSQL** (if testing without Docker)

---

## Test Setup

### Option 1: Using Docker (Recommended)

```bash
# 1. Navigate to project root
cd /path/to/H2O-ACP-Dashboard-main

# 2. Build and start services
make dev
# OR
docker-compose -f infra/docker-compose.yml up --build

# 3. In another terminal, run migrations
make migrate
# OR
docker-compose -f infra/docker-compose.yml run --rm api alembic upgrade head
```

### Option 2: Local Testing

```bash
# 1. Install dependencies
cd apps/api
pip install -r requirements.txt

# 2. Set environment variables
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/plumbing"
export ADMIN_PASSWORD="adminpassword"
export JWT_SECRET="test-secret"

# 3. Run migrations
alembic upgrade head

# 4. Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Test Suite

### 1. ✅ API Versioning Tests

#### Test 1.1: Verify API prefix
```bash
# Should return 200 OK
curl http://localhost:8000/api/v1/health

# Should return 404 (old endpoint)
curl http://localhost:8000/health
```

**Expected**: 
- `/api/v1/health` returns `{"status":"ok"}`
- `/health` returns 404

#### Test 1.2: Verify all endpoints use prefix
```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}'
```

**Expected**: Returns login success with token

---

### 2. ✅ Tenant Configuration Tests

#### Test 2.1: Valid tenant feature access
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}' \
  | jq -r '.access_token')

# Test: all_county can create jobs
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "all_county",
    "builder_id": "00000000-0000-0000-0000-000000000001",
    "community": "Test Community",
    "lot_number": "123",
    "phase": "rough",
    "status": "Pending",
    "address_line1": "123 Test St",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  }'
```

**Expected**: Returns 200 OK (job created)

#### Test 2.2: Invalid tenant feature access
```bash
# Test: h2o cannot create jobs
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "h2o",
    "builder_id": "00000000-0000-0000-0000-000000000001",
    "community": "Test Community",
    "lot_number": "123",
    "phase": "rough",
    "status": "Pending",
    "address_line1": "123 Test St",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  }'
```

**Expected**: Returns 400 Bad Request with error message about tenant not having access to JOBS feature

#### Test 2.3: Valid service call creation
```bash
# Test: h2o can create service calls
curl -X POST http://localhost:8000/api/v1/service-calls \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "h2o",
    "customer_name": "John Doe",
    "address_line1": "456 Test Ave",
    "city": "Tacoma",
    "state": "WA",
    "zip": "98401",
    "issue_description": "Leak under sink",
    "status": "New"
  }'
```

**Expected**: Returns 200 OK (service call created)

---

### 3. ✅ Rate Limiting Tests

#### Test 3.1: Login rate limiting
```bash
# Make 10 login attempts (should all succeed)
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "wrongpassword"}' \
    -w "\nStatus: %{http_code}\n"
done

# 11th attempt should be rate limited
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "wrongpassword"}' \
  -w "\nStatus: %{http_code}\n"
```

**Expected**: 
- First 10 attempts return 401 (wrong password, but not rate limited)
- 11th attempt returns 429 (Too Many Requests)

#### Test 3.2: Rate limit headers
```bash
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}' \
  -v 2>&1 | grep -i "x-ratelimit"
```

**Expected**: Response includes rate limit headers

---

### 4. ✅ User Management Tests

#### Test 4.1: Create user (admin only)
```bash
# Get admin token
TOKEN=$(curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}' \
  | jq -r '.access_token')

# Create new user
curl -X POST http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com",
    "full_name": "Test User",
    "role": "user",
    "tenant_id": "h2o"
  }'
```

**Expected**: Returns 200 OK with user object (password not included)

#### Test 4.2: Login with new user
```bash
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

**Expected**: Returns 200 OK with login success

#### Test 4.3: List users (admin only)
```bash
curl http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns list of users

#### Test 4.4: Get user profile
```bash
# Get user ID from previous response, then:
USER_ID="<user-id-from-previous-response>"

curl http://localhost:8000/api/v1/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns user object

#### Test 4.5: Update user profile
```bash
curl -X PATCH http://localhost:8000/api/v1/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "email": "updated@example.com"
  }'
```

**Expected**: Returns updated user object

#### Test 4.6: Non-admin cannot change role
```bash
# Login as regular user
USER_TOKEN=$(curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  | jq -r '.access_token')

# Try to change own role (should fail)
curl -X PATCH http://localhost:8000/api/v1/users/$USER_ID \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Expected**: Returns 403 Forbidden

#### Test 4.7: Delete user (admin only)
```bash
curl -X DELETE http://localhost:8000/api/v1/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Returns `{"deleted": true}`

#### Test 4.8: Legacy admin password still works
```bash
# Test old login format (backward compatibility)
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}'
```

**Expected**: Returns 200 OK (backward compatible)

---

## Automated Test Script

Create a file `test_api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8000/api/v1"

echo "Testing P1 Improvements..."
echo "=========================="

# Test 1: API Versioning
echo -n "Test 1.1: API versioning... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$STATUS" = "200" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL (Status: $STATUS)"
fi

# Test 2: Login
echo -n "Test 2.1: Login endpoint... "
TOKEN=$(curl -s -X POST $API_URL/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpassword"}' \
  | jq -r '.access_token // empty')
if [ -n "$TOKEN" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test 3: Tenant Configuration
echo -n "Test 3.1: Tenant validation (should fail)... "
RESPONSE=$(curl -s -X POST $API_URL/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "h2o",
    "builder_id": "00000000-0000-0000-0000-000000000001",
    "community": "Test",
    "lot_number": "123",
    "phase": "rough",
    "status": "Pending",
    "address_line1": "123 Test",
    "city": "Seattle",
    "state": "WA",
    "zip": "98101"
  }')
if echo "$RESPONSE" | grep -q "does not have access"; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi

# Test 4: User Management
echo -n "Test 4.1: Create user... "
USER_RESPONSE=$(curl -s -X POST $API_URL/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "role": "user"
  }')
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.id // empty')
if [ -n "$USER_ID" ]; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi

echo ""
echo "Tests completed!"
```

---

## Expected Results Summary

| Test Category | Expected Result |
|--------------|----------------|
| API Versioning | All endpoints accessible at `/api/v1/` |
| Tenant Config | Feature validation works correctly |
| Rate Limiting | Login limited to 10/minute |
| User Management | Full CRUD operations work |
| Backward Compatibility | Legacy admin login still works |

---

## Troubleshooting

### Issue: Import errors
**Solution**: Ensure all dependencies are installed:
```bash
pip install -r apps/api/requirements.txt
```

### Issue: Database connection errors
**Solution**: Check DATABASE_URL environment variable and ensure PostgreSQL is running

### Issue: Migration errors
**Solution**: 
```bash
# Check current migration status
alembic current

# Upgrade to latest
alembic upgrade head
```

### Issue: Rate limiting not working
**Solution**: Ensure `slowapi` is installed and limiter is properly initialized in `main.py`

---

## Next Steps

After successful testing:
1. ✅ Update frontend to use new API base URL
2. ✅ Create initial admin user
3. ✅ Migrate existing users (if any)
4. ✅ Update API documentation
5. ✅ Deploy to staging environment

---

**Status**: Ready for testing

