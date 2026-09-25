import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.findFirst({ select: { id: true, slug: true, name: true } });
  if (!clinic) throw new Error("no clinic");
  console.log("clinic:", clinic.id, clinic.slug, clinic.name);
  const hash = await bcrypt.hash("QaTest!2026", 10);

  for (const tag of ["a", "b"]) {
    const email = `qa-t4-${tag}@example.com`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {
        clinicId: clinic.id, role: "PATIENT", isActive: true,
        password: hash, consentAcceptedAt: new Date(), fullAccessOverride: true,
      } as any,
      create: {
        email, password: hash, firstName: "QA", lastName: `Teste${tag.toUpperCase()}`,
        role: "PATIENT", isActive: true, clinicId: clinic.id,
        consentAcceptedAt: new Date(), fullAccessOverride: true,
      } as any,
      select: { id: true, email: true, clinicId: true },
    });
    console.log("patient:", tag, u.id, u.email);
  }
}
main().finally(() => prisma.$disconnect());
