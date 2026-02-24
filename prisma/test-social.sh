#!/bin/bash
BASE="https://clinic.vps.brunophysicalrehabilitation.co.uk"
COOKIES="/tmp/test-cookies.txt"
rm -f $COOKIES

# Login
CSRF=$(curl -s -c $COOKIES "$BASE/api/auth/csrf" | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')
curl -s -b $COOKIES -c $COOKIES -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=${CSRF}&email=admin@brunophysicalrehabilitation.co.uk&password=Admin123!" \
  -o /dev/null

echo "=== Social Media Pages ==="
for path in /admin/social /admin/social/create /admin/social/campaigns /admin/social/templates; do
  CODE=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code}' "$BASE$path")
  echo "$path: $CODE"
done

echo ""
echo "=== Social Media APIs ==="
for path in /api/admin/social/accounts /api/admin/social/posts /api/admin/social/campaigns /api/admin/social/templates; do
  CODE=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code}' "$BASE$path")
  echo "$path: $CODE"
done

echo ""
echo "DONE"
