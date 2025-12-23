#!/bin/bash

# Configuration
CONTAINER_NAME="trento_db"
DB_USER="trento_user"
DB_NAME="trento_core"
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/trento_backup_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting backup for $DB_NAME..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $FILENAME

if [ $? -eq 0 ]; then
  echo "✅ Backup successful! File saved to: $FILENAME"
  # Keep only last 7 days of backups
  find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
else
  echo "❌ Backup failed!"
  exit 1
fi
