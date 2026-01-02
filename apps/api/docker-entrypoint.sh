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
python -c "
import os
import time
import sys
import psycopg

def wait_for_db(retries=30, delay=2):
    url = os.getenv('DATABASE_URL')
    if not url:
        print('DATABASE_URL not set, exit')
        sys.exit(1)
    # Convert postgresql+asyncpg:// to postgresql:// for psycopg (synchronous driver)
    if url.startswith('postgresql+asyncpg://'):
        url = url.replace('postgresql+asyncpg://', 'postgresql://', 1)
    for i in range(retries):
        try:
            with psycopg.connect(url) as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT 1')
                    print('DB ready')
                    return
        except Exception as e:
            if i < retries - 1:
                print(f'Waiting for DB, attempt {i+1}/{retries}, error: {e}')
                time.sleep(delay)
            else:
                print(f'Timeout waiting for DB')
                sys.exit(1)

wait_for_db()
" || {
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
