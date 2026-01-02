# Run Supabase Migrations and Create Admin User
# Usage: .\run_migrations.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL not set!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please set it first:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"' -ForegroundColor White
    Write-Host ""
    $setUrl = Read-Host "Would you like to set it now? (y/n)"
    if ($setUrl -eq "y" -or $setUrl -eq "Y") {
        $env:DATABASE_URL = "postgresql+asyncpg://postgres:bHkyLwIrYYW4F5dE@db.woxkbgzttghqwfilahfe.supabase.co:5432/postgres"
        Write-Host "✓ DATABASE_URL set" -ForegroundColor Green
    } else {
        Write-Host "Exiting. Please set DATABASE_URL and run again." -ForegroundColor Red
        exit 1
    }
}

# Check if ADMIN_PASSWORD is set
if (-not $env:ADMIN_PASSWORD) {
    Write-Host "ADMIN_PASSWORD not set!" -ForegroundColor Yellow
    Write-Host ""
    $password = Read-Host "Enter admin password (or press Enter to use default: 'adminpassword')"
    if ($password -eq "") {
        $env:ADMIN_PASSWORD = "adminpassword"
    } else {
        $env:ADMIN_PASSWORD = $password
    }
    Write-Host "✓ ADMIN_PASSWORD set" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Running database migrations..." -ForegroundColor Cyan
Write-Host ""

# Run migrations
alembic upgrade head

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Migrations failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Migrations completed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Creating admin user..." -ForegroundColor Cyan
Write-Host ""

# Create admin user
python fix_admin.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Failed to create admin user!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ All done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now log in with:" -ForegroundColor White
Write-Host "  Username: admin" -ForegroundColor Yellow
Write-Host "  Password: $env:ADMIN_PASSWORD" -ForegroundColor Yellow
Write-Host ""







