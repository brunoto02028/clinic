#!/bin/bash
BASE="https://clinic.vps.brunophysicalrehabilitation.co.uk"
COOKIES="/tmp/test-cookies.txt"
rm -f $COOKIES

# Login first
CSRF=$(curl -s -c $COOKIES "$BASE/api/auth/csrf" | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')
curl -s -b $COOKIES -c $COOKIES -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=${CSRF}&email=admin@brunophysicalrehabilitation.co.uk&password=Admin123!" \
  -o /dev/null

echo "Logged in. Running remaining tests..."
echo ""

# Session check
ROLE=$(curl -s -b $COOKIES "$BASE/api/auth/session" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("user",{}).get("role","NONE"))')
echo "1. Session role: $ROLE"

# /api/foot-scans
CODE=$(curl -s -b $COOKIES "$BASE/api/foot-scans" -o /dev/null -w '%{http_code}')
echo "2. /api/foot-scans: $CODE"

# /api/patients (list)
PCOUNT=$(curl -s -b $COOKIES "$BASE/api/patients" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d.get("patients",[])))' 2>/dev/null || echo "error")
echo "3. /api/patients count: $PCOUNT"

# /dashboard redirect
DASH=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/dashboard")
echo "4. /dashboard redirect: $DASH"

# /api/admin/stats
CODE=$(curl -s -b $COOKIES "$BASE/api/admin/stats" -o /dev/null -w '%{http_code}')
echo "5. /api/admin/stats: $CODE"

# /api/admin/dashboard/global
CODE=$(curl -s -b $COOKIES "$BASE/api/admin/dashboard/global" -o /dev/null -w '%{http_code}')
echo "6. /api/admin/dashboard/global: $CODE"

# /admin/scans
CODE=$(curl -s -b $COOKIES "$BASE/admin/scans" -o /dev/null -w '%{http_code}')
echo "7. /admin/scans: $CODE"

# /admin/global-dashboard
CODE=$(curl -s -b $COOKIES "$BASE/admin/global-dashboard" -o /dev/null -w '%{http_code}')
echo "8. /admin/global-dashboard: $CODE"

# Cleanup test patient
echo ""
echo "Cleanup..."
cd /root/clinic && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.deleteMany({where:{email:'testpatient@example.com'}}).then(r=>console.log('Deleted test patients:',r.count)).finally(()=>p.\$disconnect());"

echo ""
echo "ALL TESTS DONE"
