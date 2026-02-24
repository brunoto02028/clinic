import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const maria = await p.user.findFirst({
    where: { email: { contains: "maria" } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      password: true,
    },
  });
  console.log("Maria:", JSON.stringify(maria, null, 2));

  // Also check all users and their roles
  const users = await p.user.findMany({
    select: { email: true, role: true, firstName: true, lastName: true, isActive: true },
    orderBy: { role: "asc" },
  });
  console.log("\nAll users:");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(40)} ${u.firstName} ${u.lastName} (active: ${u.isActive})`);
  }
}

main().catch(console.error).finally(() => p.$disconnect());
