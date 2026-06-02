import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH — Update lead (stage, notes, follow-up, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updateData: any = {};

  // Allow updating any field
  const allowedFields = [
    "name", "email", "phone", "source", "stage", "priority",
    "interestedIn", "estimatedValue", "actualValue", "lastContactAt",
    "nextFollowUpAt", "followUpCount", "notes", "lostReason",
    "convertedAt", "convertedToId",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (["estimatedValue", "actualValue"].includes(field) && body[field] !== null) {
        updateData[field] = parseFloat(body[field]);
      } else if (["lastContactAt", "nextFollowUpAt", "convertedAt"].includes(field) && body[field]) {
        updateData[field] = new Date(body[field]);
      } else {
        updateData[field] = body[field];
      }
    }
  }

  // Auto-set convertedAt when moving to converted stage
  if (body.stage === "converted" && !updateData.convertedAt) {
    updateData.convertedAt = new Date();
  }

  // Auto-increment followUpCount and set lastContactAt on contact
  if (body.stage === "contacted" || body.recordContact) {
    updateData.lastContactAt = new Date();
    updateData.followUpCount = { increment: 1 };
  }

  const lead = await prisma.salesLead.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(lead);
}

// DELETE — Remove lead
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.salesLead.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
