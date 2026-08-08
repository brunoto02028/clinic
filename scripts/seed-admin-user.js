// Emergency bootstrap: creates Bruno's SUPERADMIN account if (and only if)
// NO user exists in the database at all. Written after the Aug 2026 VPS
// reinstall wiped the User table and left production with no way to log
// into /admin — no MAINTENANCE_SETUP_SECRET, no Coolify panel access, no
// SSH. This runs inside the deployed container, which already has the real
// production DATABASE_URL as an env var, so it can create the account
// without needing any of those.
//
// Safety: bails out immediately if ANY row exists in "User" — so once this
// runs once, it's permanently a no-op and safe to leave in start.sh.
//
// IMPORTANT: the password hash below is bcrypt (one-way, not reversible),
// but treat it as a factory-default — change it from Admin → your profile
// as soon as you're able to log in.
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@bpr.rehab';
const ADMIN_PASSWORD_HASH = '$2a$12$6Pls5icnjNWAuQ8JbS/4DOltGPEpsWldN3U3uwLD/MX0Kv1YD9mga'; // Bruno@Admin2026!

async function main() {
  const anyUser = await prisma.user.findFirst();
  if (anyUser) {
    console.log('[seed-admin-user] A User already exists — skipping (this only ever runs on a truly empty table).');
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD_HASH,
      firstName: 'Bruno',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
      emailVerified: new Date(),
      canManageUsers: true,
      canManageAppointments: true,
      canManageArticles: true,
      canManageSettings: true,
      canViewAllPatients: true,
      canCreateClinicalNotes: true,
    },
  });

  console.log(`[seed-admin-user] Created SUPERADMIN ${user.email} (id: ${user.id}). Change this password once logged in.`);
}

main()
  .catch((err) => console.error('[seed-admin-user] Error:', err.message))
  .finally(() => prisma.$disconnect());
