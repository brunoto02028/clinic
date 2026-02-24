import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";

export async function GET() {
  try {
    const { clinicId, userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!clinicId) {
      return NextResponse.json([]);
    }

    const treatments = await prisma.treatmentType.findMany({
      where: { clinicId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(treatments);
  } catch (error: any) {
    console.error("Error fetching treatment types:", error);
    return NextResponse.json({ error: "Failed to fetch treatment types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic selected" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, duration, price, isActive, sortOrder, category, requiresInPerson, equipmentNeeded, contraindications, indications, parameters } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const treatment = await (prisma.treatmentType as any).create({
      data: {
        clinicId,
        name,
        description: description || null,
        category: category || "OTHER",
        requiresInPerson: requiresInPerson !== undefined ? requiresInPerson : true,
        duration: duration || 60,
        price: price || 60.0,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
        equipmentNeeded: equipmentNeeded || null,
        contraindications: contraindications || null,
        indications: indications || null,
        parameters: parameters || null,
      },
    });

    return NextResponse.json(treatment);
  } catch (error: any) {
    console.error("Error creating treatment type:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A treatment with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create treatment type" }, { status: 500 });
  }
}
