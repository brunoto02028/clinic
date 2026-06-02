import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — List all qualifications
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qualifications = await prisma.qualification.findMany({
    orderBy: [{ dateAchieved: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ qualifications });
}

// POST — Add a new qualification
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const qualification = await prisma.qualification.create({
    data: {
      title: body.title,
      provider: body.provider,
      providerUrl: body.providerUrl || null,
      certificateNumber: body.certificateNumber || null,
      dateAchieved: body.dateAchieved ? new Date(body.dateAchieved) : null,
      cpdHours: body.cpdHours ? parseInt(body.cpdHours) : null,
      level: body.level || null,
      category: body.category || "general_cpd",
      accreditation: body.accreditation || null,
      tutor: body.tutor || null,
      location: body.location || null,
      description: body.description || null,
      certificateUrl: body.certificateUrl || null,
      status: body.status || "completed",
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ qualification });
}
