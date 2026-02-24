#!/bin/bash
# Test login flow
CSRF=$(curl -s -c /tmp/cookies.txt https://clinic.vps.brunophysicalrehabilitation.co.uk/api/auth/csrf | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')
echo "CSRF: $CSRF"

RESULT=$(curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST \
  'https://clinic.vps.brunophysicalrehabilitation.co.uk/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=${CSRF}&email=admin@brunophysicalrehabilitation.co.uk&password=Admin123!" \
  -o /dev/null -w '%{http_code} %{redirect_url}')

echo "Result: $RESULT"
sleep 1
echo "--- PM2 Logs ---"
pm2 logs clinic --lines 15 --nostream 2>&1
