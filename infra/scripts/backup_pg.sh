#!/bin/bash
set -e

BACKUP_DIR="/var/backups/acoustic-task-manager"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/acoustic_db_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up database at $(date)..."

docker exec acoustic-postgres pg_dump -U acoustic acoustic > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup created: $BACKUP_FILE"
  
  # Compress backup
  gzip "$BACKUP_FILE"
  echo "✅ Backup compressed: $BACKUP_FILE.gz"
  
  # Remove backups older than retention period
  find "$BACKUP_DIR" -name "acoustic_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "🧹 Cleaned up backups older than $RETENTION_DAYS days"
else
  echo "❌ Backup failed!"
  exit 1
fi
