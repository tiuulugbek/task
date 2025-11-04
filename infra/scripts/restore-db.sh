#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore the database from backup!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "📥 Restoring database from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i acoustic-postgres psql -U acoustic -d acoustic
else
    cat "$BACKUP_FILE" | docker exec -i acoustic-postgres psql -U acoustic -d acoustic
fi

echo "✅ Database restored successfully!"
EOF RESTORE
chmod +x infra/scripts/restore-db.sh
