import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // Move demo scan to admin's clinic
  const adminClinicId = "cmlk1dsn80000l6ui71xh5ky9";
  
  const updated = await p.footScan.updateMany({
    where: { scanNumber: "FS-DEMO-00001" },
    data: { clinicId: adminClinicId },
  });
  console.log("Updated:", updated.count, "scans moved to admin clinic");

  // Also make sure patient belongs to same clinic
  const scan = await p.footScan.findFirst({ where: { scanNumber: "FS-DEMO-00001" } });
  if (scan?.patientId) {
    await p.user.update({
      where: { id: scan.patientId },
      data: { clinicId: adminClinicId },
    });
    console.log("Patient also moved to admin clinic");
  }
}

main().finally(() => p.$disconnect());
