#!/bin/sh
set -e
echo "Waiting for DB to become ready..."
python -m app.wait_for_db
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
