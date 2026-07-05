export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// Lightweight endpoint for the admin sidebar badge — counts patients with
// pending activity (unread chat messages or newly-answered questions),
// without fetching the full patient list payload.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userClinicId = (session.user as any).clinicId;

    if (userRole === "PATIENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const clinicFilter = request.nextUrl.searchParams.get("clinicId");
    const effectiveClinicId = clinicFilter || userClinicId;

    const userWhere: any = { role: "PATIENT" };
    if (effectiveClinicId && (userRole !== "SUPERADMIN" || clinicFilter)) {
      userWhere.clinicId = effectiveClinicId;
    }

    const [unreadMessagePatients, answeredQPatients] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...userWhere,
          clinicMessagesReceived: { some: { senderRole: "patient", readAt: null } },
        },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          ...userWhere,
          patientQuestionsReceived: { some: { status: "answered" } },
        },
        select: { id: true },
      }),
    ]);

    const patientIds = new Set<string>([
      ...unreadMessagePatients.map((p) => p.id),
      ...answeredQPatients.map((p) => p.id),
    ]);

    return NextResponse.json({
      pendingPatients: patientIds.size,
      unreadMessages: unreadMessagePatients.length,
      answeredQuestions: answeredQPatients.length,
    });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    return NextResponse.json({ pendingPatients: 0, unreadMessages: 0, answeredQuestions: 0 });
  }
}
