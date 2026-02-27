import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { clinicId, userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, namePt, description, duration, price, discountPercent, isActive, sortOrder, category, requiresInPerson, equipmentNeeded, contraindications, indications, parameters } = body;

    const treatment = await (prisma.treatmentType as any).update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(namePt !== undefined && { namePt }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration }),
        ...(price !== undefined && { price }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(category !== undefined && { category }),
        ...(requiresInPerson !== undefined && { requiresInPerson }),
        ...(equipmentNeeded !== undefined && { equipmentNeeded }),
        ...(contraindications !== undefined && { contraindications }),
        ...(indications !== undefined && { indications }),
        ...(parameters !== undefined && { parameters }),
      },
    });

    return NextResponse.json(treatment);
  } catch (error: any) {
    console.error("Error updating treatment type:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A treatment with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update treatment type" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await (prisma.treatmentType as any).delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting treatment type:", error);
    return NextResponse.json({ error: "Failed to delete treatment type" }, { status: 500 });
  }
}
