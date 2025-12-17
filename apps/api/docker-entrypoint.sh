#!/bin/sh
set -e
echo "=========================================="
echo "Starting Plumbing Ops API"
echo "=========================================="

echo "Waiting for DB to become ready..."
python -m app.wait_for_db

echo "Running database migrations..."
cd /app
if alembic upgrade head; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migration failed, but continuing..."
    exit 1
fi

echo "Ensuring admin user exists..."
if python fix_admin.py; then
    echo "✓ Admin user ready"
else
    echo "⚠ Warning: Could not create admin user (may already exist)"
fi

echo "=========================================="
echo "Starting uvicorn server..."
echo "=========================================="
PORT=${PORT:-8000}
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
