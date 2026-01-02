# Test Marketing API Endpoints
# Step 2: API Proof

$baseUrl = "https://h2o-acp-dashboard.onrender.com/api/v1"
$token = $null

Write-Host "=" * 60
Write-Host "Step 2: API Proof"
Write-Host "=" * 60
Write-Host ""

# Step 1: Login to get token
Write-Host "1. Logging in to get auth token..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "adminpassword"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    if ($loginResponse.access_token) {
        $token = $loginResponse.access_token
        Write-Host "   [OK] Login successful" -ForegroundColor Green
        Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "   [ERROR] No token in response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   [ERROR] Login failed: $_" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test /marketing/calendar
Write-Host "2. Testing GET /marketing/calendar" -ForegroundColor Yellow
Write-Host "-" * 60
try {
    $startDate = "2025-01-01T00:00:00Z"
    $endDate = "2025-01-31T23:59:59Z"
    $url = "$baseUrl/marketing/calendar?tenant_id=h2o&start_date=$startDate&end_date=$endDate"
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri $url `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response Body:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "   [ERROR] Request failed" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ""

# Step 3: Test /marketing/post-instances
Write-Host "3. Testing GET /marketing/post-instances" -ForegroundColor Yellow
Write-Host "-" * 60
try {
    $url = "$baseUrl/marketing/post-instances?tenant_id=h2o"
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri $url `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response Body:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "   [ERROR] Request failed" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60





