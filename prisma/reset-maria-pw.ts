import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

async function main() {
  const newPassword = "Maria@2026!";
  const hash = await bcrypt.hash(newPassword, 12);

  await p.user.update({
    where: { email: "maria.santos.demo@example.com" },
    data: { password: hash },
  });

  console.log("Password updated for maria.santos.demo@example.com");
  console.log("New password:", newPassword);
}

main().catch(console.error).finally(() => p.$disconnect());
