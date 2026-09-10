import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff, type Actor } from "@/lib/tenant-access";

// Tenant-owned records edited from admin screens (content, social posts,
// templates). These routes used to check only that someone was logged in —
// and the middleware lets patients reach /api/admin — so any patient could
// edit or delete them. Staff only, and only their own tenant's; another
// tenant's record answers exactly like a missing one.
export type TenantOwnedModel = "educationContent" | "socialPost" | "socialTemplate";

export async function staffTenantRecord(
  request: NextRequest,
  model: TenantOwnedModel,
  id: string,
  notFound = "Not found"
): Promise<{ actor: Actor; response?: never } | { actor?: never; response: NextResponse }> {
  const actor = await getActor(request);
  if (!actor) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isStaff(actor)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const record = actor.clinicId
    ? await (prisma as any)[model].findFirst({
        where: { id, clinicId: actor.clinicId },
        select: { id: true },
      })
    : null;
  if (!record) {
    return { response: NextResponse.json({ error: notFound }, { status: 404 }) };
  }
  return { actor };
}
