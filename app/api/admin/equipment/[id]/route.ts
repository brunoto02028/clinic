import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/resolve-clinic-id";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const eq = await (prisma as any).clinicEquipment.findUnique({ where: { id: params.id } });
  if (!eq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(eq);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await resolveClinicId(session);
  const body = await req.json();
  const { name, manufacturer, model, description, indications, contraindications, protocols, isActive, sortOrder } = body;

  const eq = await (prisma as any).clinicEquipment.findFirst({
    where: { id: params.id, clinicId },
  });
  if (!eq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await (prisma as any).clinicEquipment.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(manufacturer !== undefined && { manufacturer: manufacturer?.trim() || null }),
      ...(model !== undefined && { model: model?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(indications !== undefined && { indications: JSON.stringify(indications) }),
      ...(contraindications !== undefined && { contraindications: JSON.stringify(contraindications) }),
      ...(protocols !== undefined && { protocols: JSON.stringify(protocols) }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await resolveClinicId(session);
  const eq = await (prisma as any).clinicEquipment.findFirst({
    where: { id: params.id, ...(clinicId ? { clinicId } : {}) },
  });
  if (!eq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await (prisma as any).clinicEquipment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
