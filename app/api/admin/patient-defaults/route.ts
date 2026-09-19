import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { MODULE_REGISTRY, PERMISSION_REGISTRY } from "@/lib/module-registry";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set([
  ...MODULE_REGISTRY.map((m) => m.key),
  ...PERMISSION_REGISTRY.map((p) => p.key),
]);

// GET/PATCH — the module/permission baseline every new patient of the
// caller's own clinic starts with (activity 62). Scoped by actor.clinicId,
// never a clinicId from the request — same reasoning as staffPatientAccess
// elsewhere: a caller can only ever read or write their own tenant's data.
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ overrides: {} });

  const clinic = await prisma.clinic.findUnique({
    where: { id: actor.clinicId },
    select: { defaultPatientModuleOverrides: true },
  });
  return NextResponse.json({ overrides: clinic?.defaultPatientModuleOverrides || {} });
}

export async function PATCH(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const { overrides } = await req.json().catch(() => ({}));
  if (overrides === undefined || overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
    return NextResponse.json({ error: "overrides must be an object" }, { status: 400 });
  }

  // Only ever store `true` grants for known module/permission keys — a
  // default is meant to give new patients a head start, not to hide or lock
  // things (that's what per-patient overrides are for).
  const clean: Record<string, true> = {};
  for (const [key, val] of Object.entries(overrides)) {
    if (val === true && VALID_KEYS.has(key)) clean[key] = true;
  }

  await prisma.clinic.update({
    where: { id: actor.clinicId },
    data: { defaultPatientModuleOverrides: clean },
  });
  return NextResponse.json({ success: true, overrides: clean });
}
