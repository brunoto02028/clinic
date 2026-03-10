const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

(async () => {
  // Check demo patient
  const demo = await p.user.findFirst({
    where: { email: "maria.santos.demo@example.com" },
    select: { id: true, email: true, password: true, isActive: true, role: true },
  });
  console.log("Demo user found:", !!demo);
  console.log("Has password:", !!demo?.password);
  console.log("Active:", demo?.isActive);
  console.log("Role:", demo?.role);

  if (demo?.password) {
    const match = await bcrypt.compare("Demo123!", demo.password);
    console.log("Password 'Demo123!' matches:", match);
  }

  // Check Lucas
  const lucas = await p.user.findFirst({
    where: { email: "lucas.luzz@outlook.com" },
    select: { id: true, email: true, password: true, isActive: true, role: true },
  });
  console.log("\nLucas found:", !!lucas);
  console.log("Has password:", !!lucas?.password);
  console.log("Active:", lucas?.isActive);

  // Check the credentials provider code path - look at auth-options
  // Let's also check what happens with the login API
  const loginRoute = require("fs").readFileSync("/root/clinic/app/api/auth/login/route.ts", "utf8");
  console.log("\n--- Login route first 30 lines ---");
  console.log(loginRoute.split("\n").slice(0, 30).join("\n"));

  await p.$disconnect();
})();
