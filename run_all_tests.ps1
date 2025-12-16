# Comprehensive Test Runner for Windows PowerShell
# Tests API endpoints, frontend integration, and generates report

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0

# 1. Check if API server is running
Write-Host "1. Checking API server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] API server is running" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] API server returned status $($response.StatusCode)" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "   [ERROR] API server is not running or not accessible" -ForegroundColor Red
    Write-Host "   Please start the API server: cd apps/api; py -m uvicorn app.main:app --reload" -ForegroundColor Yellow
    $ErrorCount++
}

Write-Host ""

# 2. Check if Web app is running
Write-Host "2. Checking Web app..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] Web app is running" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Web app returned status $($response.StatusCode)" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "   [WARNING] Web app is not running (optional for API tests)" -ForegroundColor Yellow
    Write-Host "   To start: cd apps/web; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# 3. Run API tests
Write-Host "3. Running API endpoint tests..." -ForegroundColor Yellow
Push-Location "apps/api"
try {
    $testResult = & py -m pytest tests/test_all_endpoints.py -v 2>&1
    $testOutput = $testResult | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] All API tests passed" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Some API tests failed" -ForegroundColor Red
        Write-Host $testOutput
        $ErrorCount++
    }
} catch {
    Write-Host "   [ERROR] Failed to run tests: $_" -ForegroundColor Red
    $ErrorCount++
} finally {
    Pop-Location
}

Write-Host ""

# 4. Test login endpoint
Write-Host "4. Testing login endpoint..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "adminpassword"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    if ($response.access_token) {
        Write-Host "   [OK] Login successful" -ForegroundColor Green
        $global:AuthToken = $response.access_token
    } else {
        Write-Host "   [ERROR] Login failed - no token returned" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "   [ERROR] Login failed: $_" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# 5. Test protected endpoints
if ($global:AuthToken) {
    Write-Host "5. Testing protected endpoints..." -ForegroundColor Yellow
    
    $endpoints = @(
        "/api/v1/jobs?tenant_id=all_county",
        "/api/v1/service-calls?tenant_id=h2o",
        "/api/v1/builders",
        "/api/v1/bids?tenant_id=all_county"
    )
    
    $headers = @{
        "Authorization" = "Bearer $global:AuthToken"
    }
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8000$endpoint" `
                -Method GET `
                -Headers $headers `
                -ErrorAction Stop
            
            Write-Host "   [OK] $endpoint" -ForegroundColor Green
        } catch {
            Write-Host "   [ERROR] $endpoint - $_" -ForegroundColor Red
            $ErrorCount++
        }
    }
}

Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "✅ All automated tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review COMPREHENSIVE_TEST_CHECKLIST.md for manual testing" -ForegroundColor White
    Write-Host "2. Test all pages in the web app manually" -ForegroundColor White
    Write-Host "3. Verify data accuracy from migration" -ForegroundColor White
} else {
    Write-Host "❌ Found $ErrorCount error(s). Please review above." -ForegroundColor Red
}

Write-Host ""

