import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/resolve-clinic-id";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = await resolveClinicId(session);
    if (!clinicId) return NextResponse.json([]);
    const equipment = await (prisma as any).clinicEquipment.findMany({
      where: { clinicId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(equipment);
  } catch (e: any) {
    console.error("GET /api/admin/equipment error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await resolveClinicId(session);
  if (!clinicId) return NextResponse.json({ error: "No clinic associated" }, { status: 400 });
  const body = await req.json();
  const { name, manufacturer, model, description, indications, contraindications, protocols, sortOrder } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const equipment = await (prisma as any).clinicEquipment.create({
    data: {
      clinicId,
      name: name.trim(),
      manufacturer: manufacturer?.trim() || null,
      model: model?.trim() || null,
      description: description?.trim() || null,
      indications: indications ? JSON.stringify(indications) : null,
      contraindications: contraindications ? JSON.stringify(contraindications) : null,
      protocols: protocols ? JSON.stringify(protocols) : null,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(equipment, { status: 201 });
}
