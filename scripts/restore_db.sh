#!/bin/bash

# Usage: ./scripts/restore_db.sh <backup_file>

BACKUP_FILE=$1
CONTAINER_DB="trento_db"
CONTAINER_APP="trento_api"
DB_USER="trento_user"
DB_NAME="trento_core"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Usage: $0 <path_to_sql_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ File not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE the entire database!"
echo "Target Database: $DB_NAME"
echo "Source File: $BACKUP_FILE"
read -p "Are you sure? (Type 'yes' to proceed): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "🛑 Stopping Backend to release connections..."
docker stop $CONTAINER_APP

echo "🔥 Resetting Database..."
# Drop and Recreate
docker exec $CONTAINER_DB dropdb -U $DB_USER --if-exists $DB_NAME
docker exec $CONTAINER_DB createdb -U $DB_USER $DB_NAME

echo "📥 Restoring from backup..."
# Pipe file into docker psql
cat "$BACKUP_FILE" | docker exec -i $CONTAINER_DB psql -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Restore successful."
else
    echo "❌ Restore failed."
fi

echo "🚀 Restarting Backend..."
docker start $CONTAINER_APP

echo "Done."
