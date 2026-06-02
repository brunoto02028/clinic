import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET — List patient recordings (for admin to review before/during consultation)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const patientId = searchParams.get("patientId");
  const appointmentId = searchParams.get("appointmentId");

  const where: any = {};
  if (status !== "all") where.status = status;
  if (patientId) where.patientId = patientId;
  if (appointmentId) where.appointmentId = appointmentId;

  const recordings = await prisma.consultationRecording.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Enrich with patient names
  const patientIds = [...new Set(recordings.map((r: any) => r.patientId))];
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true },
  });
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p.name]));

  const enriched = recordings.map((r: any) => ({
    ...r,
    patientName: patientMap[r.patientId] || "Unknown",
    audioUrl: undefined, // Don't send full audio in list (too large)
  }));

  return NextResponse.json({ recordings: enriched });
}

// PATCH — Mark recording as reviewed/used
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const recording = await prisma.consultationRecording.update({
    where: { id },
    data: {
      status,
      reviewedBy: (session.user as any).id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ recording });
}
