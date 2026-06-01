#!/bin/bash

# Database Backup Script for BPR Clinic
# Run daily via cron: 0 2 * * * /path/to/backup-database.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[Backup] Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}[Error] DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Perform backup using pg_dump
echo -e "${YELLOW}[Backup] Dumping database...${NC}"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}[Backup] Backup completed successfully!${NC}"
    echo -e "${GREEN}[Backup] File: $BACKUP_FILE (Size: $BACKUP_SIZE)${NC}"
else
    echo -e "${RED}[Error] Backup failed!${NC}"
    exit 1
fi

# Remove old backups
echo -e "${YELLOW}[Cleanup] Removing backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}[Cleanup] Total backups: $BACKUP_COUNT${NC}"

# Optional: Upload to S3 or cloud storage
if [ ! -z "$S3_BUCKET" ]; then
    echo -e "${YELLOW}[Upload] Uploading to S3...${NC}"
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/backups/database/$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[Upload] Successfully uploaded to S3${NC}"
    else
        echo -e "${RED}[Error] S3 upload failed${NC}"
    fi
fi

echo -e "${GREEN}[Backup] All done!${NC}"
