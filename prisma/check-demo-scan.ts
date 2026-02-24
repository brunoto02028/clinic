import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const scan = await p.footScan.findFirst({
    where: { scanNumber: "FS-DEMO-00001" },
    include: {
      clinic: { select: { id: true, name: true } },
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  console.log("Scan clinic:", scan?.clinic?.name, scan?.clinic?.id);
  console.log("Scan patient:", scan?.patient?.firstName, scan?.patient?.lastName);
  console.log("Scan status:", scan?.status);
  console.log("Scan ID:", scan?.id);
  console.log("Left images:", scan?.leftFootImages);
  console.log("Right images:", scan?.rightFootImages);

  const clinics = await p.clinic.findMany({ select: { id: true, name: true } });
  console.log("All clinics:", JSON.stringify(clinics));

  // Check which clinic the admin user belongs to
  const admin = await p.user.findFirst({ where: { email: "admin@bpr.rehab" } });
  console.log("Admin clinicId:", admin?.clinicId);
}

main().finally(() => p.$disconnect());
