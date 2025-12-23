# Auto-Posting Worker

Background worker that automatically publishes scheduled posts when they're due.

## Overview

The `AutoPoster` worker runs continuously, checking every 60 seconds for posts that are:
- Status: `Scheduled`
- `scheduled_for` <= current time
- `autopost_enabled` = `True`
- Has a `content_item_id` (not just a planned slot)

## Running the Worker

### Development

```bash
cd apps/api
python -m app.workers.auto_poster
```

### Production

The worker should be run as a separate process/service. Options:

1. **Docker Compose** (recommended):
   ```yaml
   services:
     auto_poster_worker:
       build: ./apps/api
       command: python -m app.workers.auto_poster
       depends_on:
         - db
       environment:
         - DATABASE_URL=${DATABASE_URL}
       restart: unless-stopped
   ```

2. **Systemd Service**:
   ```ini
   [Unit]
   Description=Marketing Auto-Poster Worker
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/apps/api
   ExecStart=/usr/bin/python3 -m app.workers.auto_poster
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Supervisor**:
   ```ini
   [program:auto_poster]
   command=python -m app.workers.auto_poster
   directory=/path/to/apps/api
   autostart=true
   autorestart=true
   stderr_logfile=/var/log/auto_poster.err.log
   stdout_logfile=/var/log/auto_poster.out.log
   ```

## How It Works

1. **Check Loop**: Every 60 seconds, queries for due posts
2. **Publish**: For each due post:
   - Creates a `PublishJob` to track the attempt
   - Gets platform-specific publisher (Facebook, Instagram, Google Business, etc.)
   - Publishes the post with caption and media
   - Updates `PostInstance` status to `Posted` and sets `posted_at`
   - Updates `PublishJob` status to `completed`
3. **Error Handling**: If publishing fails:
   - Marks `PostInstance` status as `Failed`
   - Sets `last_error` field
   - Updates `PublishJob` status to `failed`

## Publishers

Platform-specific publishers are in `app/publishers/`:
- `base.py`: Base publisher interface
- `stub.py`: Stub publisher for testing (logs instead of publishing)
- Platform-specific publishers can be added (e.g., `facebook.py`, `instagram.py`)

The worker automatically selects the correct publisher based on the channel account's platform.

## Logging

The worker logs:
- Startup message
- Number of posts found due for publishing
- Success/failure for each post
- Errors with full stack traces

Log level can be configured via Python's logging module.

