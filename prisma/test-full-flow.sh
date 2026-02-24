#!/bin/bash
set -e
BASE="https://clinic.vps.brunophysicalrehabilitation.co.uk"
COOKIES="/tmp/test-cookies.txt"
rm -f $COOKIES

echo "═══════════════════════════════════════"
echo "  FULL FLOW TEST"
echo "═══════════════════════════════════════"

# 1. Get CSRF token
echo ""
echo "1. Getting CSRF token..."
CSRF=$(curl -s -c $COOKIES "$BASE/api/auth/csrf" | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')
echo "   CSRF: ${CSRF:0:20}..."

# 2. Login
echo ""
echo "2. Logging in as admin@brunophysicalrehabilitation.co.uk..."
LOGIN_RESULT=$(curl -s -b $COOKIES -c $COOKIES -X POST \
  "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=${CSRF}&email=admin@brunophysicalrehabilitation.co.uk&password=Admin123!" \
  -o /dev/null -w '%{http_code} %{redirect_url}')
echo "   Result: $LOGIN_RESULT"

HTTP_CODE=$(echo $LOGIN_RESULT | awk '{print $1}')
REDIRECT_URL=$(echo $LOGIN_RESULT | awk '{print $2}')

if [ "$HTTP_CODE" != "302" ]; then
  echo "   FAIL: Expected 302, got $HTTP_CODE"
  exit 1
fi
echo "   OK: Login successful (302 redirect)"

# 3. Check redirect destination
echo ""
echo "3. Checking redirect..."
echo "   Redirect URL: $REDIRECT_URL"

# 4. Get session to verify role
echo ""
echo "4. Checking session/role..."
SESSION=$(curl -s -b $COOKIES "$BASE/api/auth/session")
echo "   Session: $(echo $SESSION | python3 -c 'import sys,json;d=json.load(sys.stdin);u=d.get("user",{});print(f"name={u.get(\"name\")}, role={u.get(\"role\")}, clinicId={u.get(\"clinicId\")}")')"

ROLE=$(echo $SESSION | python3 -c 'import sys,json;print(json.load(sys.stdin).get("user",{}).get("role",""))')
echo "   Role: $ROLE"

# 5. Access /admin (should work for SUPERADMIN)
echo ""
echo "5. Accessing /admin..."
ADMIN_CODE=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code}' "$BASE/admin")
echo "   /admin HTTP: $ADMIN_CODE"
if [ "$ADMIN_CODE" = "200" ]; then
  echo "   OK: Admin page accessible"
else
  echo "   FAIL: Got $ADMIN_CODE"
fi

# 6. Access /admin/patients
echo ""
echo "6. Accessing /admin/patients..."
PATIENTS_CODE=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code}' "$BASE/admin/patients")
echo "   /admin/patients HTTP: $PATIENTS_CODE"

# 7. Test patient creation API
echo ""
echo "7. Creating test patient..."
CREATE_RESULT=$(curl -s -b $COOKIES -X POST \
  "$BASE/api/admin/patients" \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"Patient","email":"testpatient@example.com","phone":"+44 7000000000"}')
echo "   Result: $(echo $CREATE_RESULT | head -c 200)"

# Check if patient was created
HAS_PATIENT=$(echo $CREATE_RESULT | python3 -c 'import sys,json;d=json.load(sys.stdin);print("OK" if "patient" in d else f"FAIL: {d.get(\"error\",\"unknown\")}")')
echo "   Patient creation: $HAS_PATIENT"

# 8. List patients via /api/patients
echo ""
echo "8. Listing patients..."
PATIENTS=$(curl -s -b $COOKIES "$BASE/api/patients")
PATIENT_COUNT=$(echo $PATIENTS | python3 -c 'import sys,json;d=json.load(sys.stdin);p=d.get("patients",d) if isinstance(d,dict) else d;print(len(p) if isinstance(p,list) else 0)')
echo "   Patient count: $PATIENT_COUNT"

# 9. Test foot scans page
echo ""
echo "9. Accessing /admin/scans..."
SCANS_CODE=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code}' "$BASE/admin/scans")
echo "   /admin/scans HTTP: $SCANS_CODE"

# 10. Test /api/foot-scans
echo ""
echo "10. Testing /api/foot-scans..."
FOOTSCANS=$(curl -s -b $COOKIES "$BASE/api/foot-scans" -o /dev/null -w '%{http_code}')
echo "   /api/foot-scans HTTP: $FOOTSCANS"

# 11. Test /dashboard redirect for SUPERADMIN
echo ""
echo "11. Testing /dashboard redirect for SUPERADMIN..."
DASH_REDIRECT=$(curl -s -b $COOKIES -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/dashboard")
echo "   /dashboard: $DASH_REDIRECT"

# 12. Test Global View
echo ""
echo "12. Testing Global View API..."
GLOBAL=$(curl -s -b $COOKIES "$BASE/api/admin/dashboard/global" -o /dev/null -w '%{http_code}')
echo "   /api/admin/dashboard/global HTTP: $GLOBAL"

# 13. Test admin stats
echo ""
echo "13. Testing Admin Stats API..."
STATS=$(curl -s -b $COOKIES "$BASE/api/admin/stats" -o /dev/null -w '%{http_code}')
echo "   /api/admin/stats HTTP: $STATS"

echo ""
echo "═══════════════════════════════════════"
echo "  TEST COMPLETE"
echo "═══════════════════════════════════════"

# Cleanup test patient
echo ""
echo "Cleanup: Removing test patient..."
cd /root/clinic && node -e "
const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.user.deleteMany({where:{email:'testpatient@example.com'}}).then(r=>console.log('Deleted:',r.count)).catch(e=>console.error(e)).finally(()=>p.\$disconnect());
"
