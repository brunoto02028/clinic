#!/bin/bash
set -e

echo "=== Clinic Docker Deploy ==="

cd /root/clinic

# Stop PM2 if running
pm2 stop clinic 2>/dev/null || true
pm2 delete clinic 2>/dev/null || true

# Stop existing container if running
docker stop clinic-app 2>/dev/null || true
docker rm clinic-app 2>/dev/null || true

# Build Docker image with standalone output
echo "Building Docker image..."
NEXT_OUTPUT_MODE=standalone docker build -t clinic-app:latest .

# Run container
echo "Starting container..."
docker run -d \
  --name clinic-app \
  --restart unless-stopped \
  -p 4002:4002 \
  --env-file /root/clinic/.env \
  -e NODE_ENV=production \
  -e PORT=4002 \
  -e HOSTNAME=0.0.0.0 \
  -e NEXT_OUTPUT_MODE=standalone \
  -v /root/clinic-uploads:/app/public/uploads \
  clinic-app:latest

echo "Container started!"
docker ps | grep clinic-app
