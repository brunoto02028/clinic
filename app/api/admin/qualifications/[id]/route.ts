import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH — Update qualification
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.provider !== undefined) updateData.provider = body.provider;
  if (body.providerUrl !== undefined) updateData.providerUrl = body.providerUrl;
  if (body.certificateNumber !== undefined) updateData.certificateNumber = body.certificateNumber;
  if (body.dateAchieved !== undefined) updateData.dateAchieved = body.dateAchieved ? new Date(body.dateAchieved) : null;
  if (body.cpdHours !== undefined) updateData.cpdHours = body.cpdHours ? parseInt(body.cpdHours) : null;
  if (body.level !== undefined) updateData.level = body.level;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.accreditation !== undefined) updateData.accreditation = body.accreditation;
  if (body.tutor !== undefined) updateData.tutor = body.tutor;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.certificateUrl !== undefined) updateData.certificateUrl = body.certificateUrl;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const qualification = await prisma.qualification.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ qualification });
}

// DELETE — Remove qualification
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.qualification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
