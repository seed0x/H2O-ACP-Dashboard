#!/bin/sh
set -e
echo "Waiting for DB to become ready..."
python -m app.wait_for_db
echo "Running database migrations..."
cd /app && alembic upgrade head
echo "Ensuring admin user exists..."
python fix_admin.py || echo "Warning: Could not create admin user (may already exist)"
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
