const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const users = await p.user.findMany({
    where: {
      OR: [
        { firstName: { contains: "lucas", mode: "insensitive" } },
        { lastName: { contains: "lucas", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      password: true,
      emailVerified: true,
      accounts: { select: { provider: true, type: true } },
    },
  });

  users.forEach((u) => {
    console.log(JSON.stringify({
      id: u.id,
      email: u.email,
      name: u.firstName + " " + u.lastName,
      role: u.role,
      active: u.isActive,
      hasPw: !!u.password,
      verified: !!u.emailVerified,
      accounts: u.accounts,
    }, null, 2));
  });

  if (users.length === 0) {
    console.log("No user found with name containing 'lucas'");
    // List all patients for reference
    const patients = await p.user.findMany({
      where: { role: "PATIENT" },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
      orderBy: { firstName: "asc" },
    });
    console.log("\nAll patients:");
    patients.forEach((p) => console.log(`  ${p.firstName} ${p.lastName} <${p.email}> active=${p.isActive}`));
  }

  await p.$disconnect();
})();
