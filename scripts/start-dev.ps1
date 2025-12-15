param(
    [int]$waitSeconds = 120
)

$dcFile = "infra/docker-compose.yml"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker not found. Please install Docker Desktop and retry." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Docker Compose"
docker compose -f $dcFile up --build -d

$timeout = Get-Date).AddSeconds($waitSeconds)

function Wait-Http($url, $timeoutSeconds) {
    $start = Get-Date
    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3
            if ($res.StatusCode -eq 200) { return $true }
        } catch {}
        Start-Sleep -Seconds 2
    }
    return $false
}

Write-Host "Waiting for API to be healthy..."
$ok = Wait-Http "http://localhost:8000/health" 120
if (-not $ok) {
    Write-Host "API did not become healthy within timeout" -ForegroundColor Red
    docker compose -f $dcFile logs api --tail 200
    exit 1
}

Write-Host "API healthy. Running migrations..."
docker compose -f $dcFile run --rm api alembic upgrade head

Write-Host "Seeding DB..."
docker compose -f $dcFile run --rm api python -m app.seed

Write-Host "Dev stack ready. Visit http://localhost:3000 and http://localhost:8000"
start "http://localhost:3000"
start "http://localhost:8000/health"
