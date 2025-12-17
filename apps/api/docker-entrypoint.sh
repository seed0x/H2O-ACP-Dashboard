#!/bin/sh
set -e
echo "=========================================="
echo "Starting Plumbing Ops API"
echo "=========================================="

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    echo "Please set it in Render dashboard: Environment → Environment Variables"
    exit 1
fi

echo "DATABASE_URL is set (host: $(echo $DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/'))"

echo "Waiting for DB to become ready..."
python -m app.wait_for_db || {
    echo "ERROR: Could not connect to database!"
    echo "Check your DATABASE_URL in Render environment variables"
    exit 1
}

echo "Running database migrations..."
cd /app
alembic upgrade head || {
    echo "ERROR: Migrations failed!"
    exit 1
}
echo "✓ Migrations completed successfully"

echo "Ensuring admin user exists..."
python fix_admin.py || {
    echo "⚠ Warning: Could not create admin user (may already exist)"
}

echo "=========================================="
echo "Starting uvicorn server..."
echo "=========================================="
PORT=${PORT:-8000}
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
