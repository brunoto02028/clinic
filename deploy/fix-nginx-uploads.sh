#!/bin/bash
set -e

# Add /uploads/ location to Nginx config to serve uploaded files directly
NGINX_CONF="/etc/nginx/sites-available/clinic"

# Check if uploads location already exists
if grep -q "location /uploads/" "$NGINX_CONF"; then
  echo "Uploads location already configured in Nginx"
else
  # Insert uploads location before the main proxy location
  sed -i '/location \/ {/i\
    location /uploads/ {\
        alias /root/clinic/public/uploads/;\
        expires 30d;\
        add_header Cache-Control "public, immutable";\
        try_files $uri =404;\
    }\
' "$NGINX_CONF"
  echo "Added /uploads/ location to Nginx config"
fi

# Test and reload Nginx
nginx -t && systemctl reload nginx
echo "Nginx reloaded successfully"
echo "DONE"
