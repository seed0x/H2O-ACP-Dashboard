# Comprehensive API Test Script
# Tests all endpoints and features

# Test against Render API (production)
# For local testing, change to: http://localhost:8000/api/v1
$baseUrl = "https://h2o-acp-dashboard.onrender.com/api/v1"
$token = $null
$adminToken = $null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Comprehensive API Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [object]$Body = $null,
        [string]$Token = $null,
        [bool]$ExpectError = $false
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $bodyJson -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing
        }
        
        if ($ExpectError) {
            Write-Host "  [FAIL] Expected error but got success" -ForegroundColor Red
            return $null
        }
        
        return @{
            StatusCode = $response.StatusCode
            Content = $response.Content | ConvertFrom-Json
            Success = $true
        }
    } catch {
        if ($ExpectError) {
            Write-Host "  [OK] Expected error occurred" -ForegroundColor Green
            return @{ Success = $true; ExpectedError = $true }
        }
        
        $statusCode = $null
        $errorContent = $null
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $errorContent = $reader.ReadToEnd()
            } catch {
                $errorContent = $_.Exception.Message
            }
        } else {
            $statusCode = 0
            $errorContent = $_.Exception.Message
        }
        
        return @{
            StatusCode = $statusCode
            Error = $errorContent
            Success = $false
        }
    }
}

# Test 1: Health Check
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/health"
if ($result.Success -and $result.StatusCode -eq 200) {
    Write-Host "  [OK] Health check passed" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Health check failed - Status: $($result.StatusCode)" -ForegroundColor Red
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: Login (Admin)
Write-Host "2. Testing Login (Admin)..." -ForegroundColor Yellow
# Try common passwords
$passwordsToTry = @("adminpassword", "test-admin", "admin")
$loginSuccessful = $false

foreach ($pwd in $passwordsToTry) {
    $loginBody = @{
        username = "admin"
        password = $pwd
    }
    Write-Host "  Trying password: $pwd..." -ForegroundColor Gray
    $result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/login" -Body $loginBody
    if ($result.Success -and $result.StatusCode -eq 200) {
        # Token might be in different fields depending on response format
        if ($result.Content.access_token) {
            $adminToken = $result.Content.access_token
        } elseif ($result.Content.token) {
            $adminToken = $result.Content.token
        } elseif ($result.Content.message) {
            $adminToken = $result.Content.message
        } else {
            # Try to extract token from response
            $adminToken = $result.Content | ConvertTo-Json -Compress
        }
        Write-Host "  [OK] Admin login successful with password: $pwd" -ForegroundColor Green
        Write-Host "  Response: $($result.Content | ConvertTo-Json)" -ForegroundColor Gray
        $loginSuccessful = $true
        break
    }
}

if (-not $loginSuccessful) {
    Write-Host "  [FAIL] Admin login failed with all attempted passwords" -ForegroundColor Red
    Write-Host "  Tried: $($passwordsToTry -join ', ')" -ForegroundColor Yellow
    Write-Host "  Note: Check ADMIN_PASSWORD environment variable on Render" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Get Token from Cookie (for subsequent requests)
# Note: In real scenario, token would be in cookie, but for testing we'll use Bearer token
# For now, we'll create a user and use that token

# Test 4: User Management - Create User
Write-Host "3. Testing User Management - Create User..." -ForegroundColor Yellow
$newUser = @{
    username = "testuser"
    password = "testpass123"
    email = "testuser@example.com"
    full_name = "Test User"
    role = "user"
    tenant_id = "all_county"
}
$result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/users" -Body $newUser -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200 -or $result.StatusCode -eq 201) {
    $userId = $result.Content.id
    Write-Host "  [OK] User created successfully" -ForegroundColor Green
    Write-Host "  User ID: $userId" -ForegroundColor Gray
} else {
    Write-Host "  [WARN] User creation: $($result.StatusCode) - $($result.Error)" -ForegroundColor Yellow
    # User might already exist, try to login
    Write-Host "  Attempting login with test user..." -ForegroundColor Yellow
    $loginBody = @{
        username = "testuser"
        password = "testpass123"
    }
    $loginResult = Invoke-ApiCall -Method "POST" -Url "$baseUrl/login" -Body $loginBody
    if ($loginResult.Success) {
        Write-Host "  [OK] Test user login successful" -ForegroundColor Green
        $token = "testuser-token" # We'll use admin token for now
    }
}
Write-Host ""

# Test 5: List Users
Write-Host "4. Testing List Users..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/users" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    $userCount = ($result.Content | Measure-Object).Count
    $msg = '  [OK] Users listed successfully (' + $userCount + ' users)'
    Write-Host $msg -ForegroundColor Green
} else {
    Write-Host "  [FAIL] List users failed" -ForegroundColor Red
}
Write-Host ""

# Test 6: Builders - List
Write-Host "5. Testing Builders - List..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/builders" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    Write-Host "  [OK] Builders listed successfully" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] List builders failed" -ForegroundColor Red
}
Write-Host ""

# Test 7: Builders - Create
Write-Host "6. Testing Builders - Create..." -ForegroundColor Yellow
$newBuilder = @{
    name = "Test Builder $(Get-Date -Format 'yyyyMMddHHmmss')"
    notes = "Test builder created by automated test"
}
$result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/builders" -Body $newBuilder -Token $adminToken
if ($result.Success -and ($result.StatusCode -eq 200 -or $result.StatusCode -eq 201)) {
    $builderId = $result.Content.id
    Write-Host "  [OK] Builder created successfully" -ForegroundColor Green
    Write-Host "  Builder ID: $builderId" -ForegroundColor Gray
    
    # Test 8: Get Builder
    Write-Host "7. Testing Get Builder..." -ForegroundColor Yellow
    $getResult = Invoke-ApiCall -Url "$baseUrl/builders/$builderId" -Token $adminToken
    if ($getResult.Success) {
        Write-Host "  [OK] Builder retrieved successfully" -ForegroundColor Green
    }
} else {
    Write-Host "  [WARN] Builder creation: $($result.StatusCode)" -ForegroundColor Yellow
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Gray
    }
    # Try to get an existing builder
    Write-Host "  Attempting to use existing builder..." -ForegroundColor Yellow
    $listResult = Invoke-ApiCall -Url "$baseUrl/builders" -Token $adminToken
    if ($listResult.Success -and $listResult.Content -and $listResult.Content.Count -gt 0) {
        $builderId = $listResult.Content[0].id
        Write-Host "  [OK] Using existing builder ID: $builderId" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] No builders available for job creation test" -ForegroundColor Red
    }
}
Write-Host ""

# Test 9: Jobs - List
Write-Host "8. Testing Jobs - List..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/jobs?tenant_id=all_county" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    Write-Host "  [OK] Jobs listed successfully" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] List jobs failed" -ForegroundColor Red
}
Write-Host ""

# Test 10: Jobs - Create (with tenant validation)
Write-Host "9. Testing Jobs - Create (Tenant Validation)..." -ForegroundColor Yellow
if ($builderId) {
    $newJob = @{
        tenant_id = "all_county"
        builder_id = $builderId
        community = "Test Community"
        lot_number = "123"
        phase = "Phase 1"
        status = "draft"
        address_line1 = "123 Test Street"
        city = "Seattle"
        state = "WA"
        zip = "98101"
    }
    $result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/jobs" -Body $newJob -Token $adminToken
    if ($result.Success -and ($result.StatusCode -eq 200 -or $result.StatusCode -eq 201)) {
        $jobId = $result.Content.id
        Write-Host "  [OK] Job created successfully" -ForegroundColor Green
        Write-Host "  Job ID: $jobId" -ForegroundColor Gray
    } else {
        Write-Host "  [WARN] Job creation: $($result.StatusCode)" -ForegroundColor Yellow
        if ($result.Error) {
            Write-Host "  Error details: $($result.Error)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  [SKIP] Job creation skipped - no builder ID available" -ForegroundColor Yellow
}
Write-Host ""

# Test 11: Jobs - Invalid Tenant (should fail)
Write-Host "10. Testing Jobs - Invalid Tenant (should fail)..." -ForegroundColor Yellow
if ($builderId) {
    $invalidJob = @{
        tenant_id = "invalid_tenant"
        builder_id = $builderId
        community = "Test"
        lot_number = "123"
        phase = "Phase 1"
        status = "draft"
        address_line1 = "123 Test Street"
        city = "Seattle"
        state = "WA"
        zip = "98101"
    }
    $result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/jobs" -Body $invalidJob -Token $adminToken -ExpectError $true
    if ($result.ExpectedError) {
        Write-Host "  [OK] Tenant validation working (correctly rejected invalid tenant)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Tenant validation may not be working" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [SKIP] Invalid tenant test skipped - no builder ID available" -ForegroundColor Yellow
}
Write-Host ""

# Test 12: Bids - List
Write-Host "11. Testing Bids - List..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/bids" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    Write-Host "  [OK] Bids listed successfully" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] List bids failed" -ForegroundColor Red
}
Write-Host ""

# Test 13: Service Calls - List
Write-Host "12. Testing Service Calls - List..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/service-calls?tenant_id=h2o" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    Write-Host "  [OK] Service calls listed successfully" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] List service calls failed" -ForegroundColor Red
}
Write-Host ""

# Test 14: Marketing - Channels (reference list for creating accounts)
Write-Host "13. Testing Marketing - Channels (reference list)..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/marketing/channels?tenant_id=h2o" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    $channelCount = ($result.Content | Measure-Object).Count
    $msg = '  [OK] Marketing channels listed successfully (' + $channelCount + ' channels)'
    Write-Host $msg -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Marketing channels: $($result.StatusCode)" -ForegroundColor Red
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Gray
    }
}
Write-Host ""

# Test 15: Marketing - Channel Accounts (the actual working entities)
Write-Host "14. Testing Marketing - Channel Accounts..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/marketing/channel-accounts?tenant_id=h2o" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    $accountCount = ($result.Content | Measure-Object).Count
    $msg = '  [OK] Channel accounts listed successfully (' + $accountCount + ' accounts)'
    Write-Host $msg -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Channel accounts: $($result.StatusCode)" -ForegroundColor Red
    if ($result.Error) {
        Write-Host "  Error: $($result.Error)" -ForegroundColor Gray
    }
}
Write-Host ""

# Test 15b: Marketing - Content Items
Write-Host "15. Testing Marketing - Content Items..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/marketing/content-items?tenant_id=h2o" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    $itemCount = ($result.Content | Measure-Object).Count
    $msg = '  [OK] Content items listed successfully (' + $itemCount + ' items)'
    Write-Host $msg -ForegroundColor Green
} else {
    Write-Host "  [WARN] Content items: $($result.StatusCode)" -ForegroundColor Yellow
}
Write-Host ""

# Test 16: Audit Log
Write-Host "16. Testing Audit Log..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/audit?limit=10" -Token $adminToken
if ($result.Success -and $result.StatusCode -eq 200) {
    $auditCount = ($result.Content | Measure-Object).Count
    $msg = '  [OK] Audit log accessed successfully (' + $auditCount + ' entries)'
    Write-Host $msg -ForegroundColor Green
} else {
    Write-Host "  [WARN] Audit log: $($result.StatusCode)" -ForegroundColor Yellow
}
Write-Host ""

# Test 17: Rate Limiting (Login attempts)
Write-Host "17. Testing Rate Limiting (Login attempts)..." -ForegroundColor Yellow
$rateLimitTested = $false
for ($i = 1; $i -le 12; $i++) {
    $loginBody = @{
        username = "admin"
        password = "wrong-password"
    }
    $result = Invoke-ApiCall -Method "POST" -Url "$baseUrl/login" -Body $loginBody -ExpectError $true
    if ($i -eq 11 -and $result.StatusCode -eq 429) {
        Write-Host '  [OK] Rate limiting working (429 after 10 attempts)' -ForegroundColor Green
        $rateLimitTested = $true
        break
    }
    Start-Sleep -Milliseconds 100
}
if (-not $rateLimitTested) {
    Write-Host '  [WARN] Rate limiting test inconclusive (may need more attempts)' -ForegroundColor Yellow
}
Write-Host ""

# Test 18: Unauthorized Access
Write-Host "18. Testing Unauthorized Access..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/users" -ExpectError $true
if ($result.ExpectedError -or $result.StatusCode -eq 401) {
    Write-Host "  [OK] Unauthorized access correctly blocked" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Authorization may not be working" -ForegroundColor Yellow
}
Write-Host ""

# Test 19: Invalid Endpoint
Write-Host "19. Testing Invalid Endpoint (404)..." -ForegroundColor Yellow
$result = Invoke-ApiCall -Url "$baseUrl/invalid-endpoint" -ExpectError $true
if ($result.ExpectedError -or $result.StatusCode -eq 404) {
    Write-Host "  [OK] 404 handling working correctly" -ForegroundColor Green
} else {
    Write-Host "  [WARN] 404 handling may not be working" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

