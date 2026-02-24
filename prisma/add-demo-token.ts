import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const token = crypto.randomBytes(16).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const scan = await prisma.footScan.update({
    where: { scanNumber: "FS-DEMO-00001" },
    data: {
      scanToken: token,
      scanTokenExpiry: expiry,
      status: "PENDING_UPLOAD",
    },
    select: { id: true, scanToken: true },
  });

  console.log("Token:", scan.scanToken);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
