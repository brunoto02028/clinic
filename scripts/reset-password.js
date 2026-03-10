const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

(async () => {
  const newPassword = "Lucas2026!";
  const hash = await bcrypt.hash(newPassword, 10);

  const updated = await p.user.update({
    where: { email: "lucas.luzz@outlook.com" },
    data: { password: hash },
    select: { id: true, email: true, firstName: true },
  });

  console.log("Password reset for:", updated.email, `(${updated.firstName})`);
  console.log("New password:", newPassword);

  // Also reset demo patient
  const demoHash = await bcrypt.hash("Demo123!", 10);
  const demo = await p.user.update({
    where: { email: "maria.santos.demo@example.com" },
    data: { password: demoHash },
    select: { id: true, email: true },
  });
  console.log("Demo patient reset:", demo.email, "-> Demo123!");

  await p.$disconnect();
})();
