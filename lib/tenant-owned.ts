import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor, type Actor } from "@/lib/tenant-access";

// Staff of the active tenant with one of the given roles, or null (activity
// 52, T-8). Replaces the legacy `session.user.clinicId` reads in the catalog
// routes, which ignored the SUPERADMIN's selected clinic and re-read nothing.
export async function tenantStaff(request: NextRequest, roles: string[]): Promise<(Actor & { clinicId: string }) | null> {
  const actor = await getSessionStaffActor(request);
  if (!actor || !actor.clinicId || !roles.includes(actor.role)) return null;
  return actor as Actor & { clinicId: string };
}

// True when a row of `model` with this id lives in the given tenant. Catalog
// routes updated or deleted by id alone, so one tenant's staff could edit
// another's rows (activity 52, T-8).
export async function ownedByTenant(model: string, id: unknown, clinicId: string): Promise<boolean> {
  // A body can carry an object here ({ not: "" }), which Prisma would read as
  // a filter — only a plain id string is an id.
  if (typeof id !== "string" || !id) return false;
  const row = await (prisma as any)[model].findFirst({ where: { id, clinicId }, select: { id: true } });
  return !!row;
}

// Only these scalar fields of a PATCH body reach Prisma — never relations
// (`clinic: { connect }` moved an item into another tenant) or ids/timestamps
// (activity 52, T-8). A conditionId must be one of the caller's conditions.
export async function pickCatalogFields(
  body: Record<string, unknown>,
  allowed: readonly string[],
  clinicId: string
): Promise<{ data: Record<string, unknown> } | { error: string }> {
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];
  if ("conditionId" in data && data.conditionId !== null && data.conditionId !== "") {
    if (!(await ownedByTenant("condition", data.conditionId, clinicId))) return { error: "Condition not found" };
  }
  return { data };
}
