#!/bin/bash
set +H

echo "=== Clinic Docker Deploy ==="
cd /root/clinic

# Stop PM2 if running
pm2 stop clinic 2>/dev/null || true
pm2 delete clinic 2>/dev/null || true

# Stop existing container
docker stop clinic-app 2>/dev/null || true
docker rm clinic-app 2>/dev/null || true

# Extract env vars from .env
DB_URL=$(grep DATABASE_URL /root/clinic/.env | sed "s/DATABASE_URL='//" | sed "s/'//")
STRIPE_KEY=$(grep STRIPE_SECRET_KEY /root/clinic/.env | sed "s/STRIPE_SECRET_KEY=//")

# Build Docker image with all required build args
echo "Building Docker image..."
docker build \
  --build-arg "DATABASE_URL=$DB_URL" \
  --build-arg "STRIPE_SECRET_KEY=$STRIPE_KEY" \
  --build-arg "NEXT_OUTPUT_MODE=standalone" \
  -t clinic-app:latest .

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
  -v /root/clinic-uploads:/app/public/uploads \
  clinic-app:latest

echo "Container started!"
docker ps | grep clinic-app
