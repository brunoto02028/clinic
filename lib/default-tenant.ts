import { prisma } from "@/lib/db";

// The tenant that sign-ups without a tenant link, the public site and the
// platform owner's session fall back to. Explicit on purpose: `findFirst` with
// no order picked whichever clinic Postgres happened to return first.
//
// DEFAULT_CLINIC_SLUG names it. Without the variable it is only inferred when
// exactly one active clinic exists; with more, there is no default and
// callers fail closed.
export async function getDefaultClinicId(): Promise<string | null> {
  const slug = process.env.DEFAULT_CLINIC_SLUG;
  if (slug) {
    const clinic = await prisma.clinic.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });
    if (clinic?.isActive) return clinic.id;
    console.error(`[tenant] DEFAULT_CLINIC_SLUG="${slug}" does not match an active clinic`);
    return null;
  }

  const active = await prisma.clinic.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 2,
  });
  if (active.length === 1) return active[0].id;
  if (active.length > 1) {
    console.error("[tenant] More than one active clinic and DEFAULT_CLINIC_SLUG is not set — no default tenant");
  }
  return null;
}
