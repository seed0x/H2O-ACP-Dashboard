#!/bin/bash
# Database backup script
# Usage: ./scripts/backup-db.sh

set -e

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="plumbing_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
docker-compose -f infra/docker-compose.prod.yml exec -T db pg_dump -U postgres plumbing > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "plumbing_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Location: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
