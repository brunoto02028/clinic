import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — Send educational content to patients
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

    const body = await req.json();
    const { contentId, sendTo, patientIds, conditionTags } = body;

    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    // Verify content exists
    const content = await prisma.educationContent.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, tags: true, bodyParts: true, isPublished: true },
    });

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    let targetPatients: { id: string; firstName: string; lastName: string; email: string }[] = [];

    if (sendTo === "all") {
      // Send to all patients in the clinic
      targetPatients = await prisma.user.findMany({
        where: { clinicId, role: "PATIENT", isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    } else if (sendTo === "specific" && Array.isArray(patientIds) && patientIds.length > 0) {
      // Send to specific patients
      targetPatients = await prisma.user.findMany({
        where: { id: { in: patientIds }, role: "PATIENT", isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    } else if (sendTo === "condition" && Array.isArray(conditionTags) && conditionTags.length > 0) {
      // Find patients with matching diagnoses/protocols
      const lowerTags = conditionTags.map((t: string) => t.toLowerCase());

      // Search in treatment protocols for matching conditions
      const protocols = await (prisma as any).treatmentProtocol.findMany({
        where: {
          clinicId,
          OR: [
            { title: { contains: lowerTags[0], mode: "insensitive" } },
            ...lowerTags.map((tag: string) => ({
              title: { contains: tag, mode: "insensitive" },
            })),
          ],
        },
        select: { patientId: true },
      });

      const protocolPatientIds = [...new Set(protocols.map((p: any) => p.patientId))];

      // Also search in diagnoses
      let diagnosisPatientIds: string[] = [];
      try {
        const diagnoses = await (prisma as any).diagnosis.findMany({
          where: {
            clinicId,
            OR: lowerTags.flatMap((tag: string) => [
              { primaryDiagnosis: { contains: tag, mode: "insensitive" } },
              { affectedArea: { contains: tag, mode: "insensitive" } },
            ]),
          },
          select: { patientId: true },
        });
        diagnosisPatientIds = diagnoses.map((d: any) => d.patientId);
      } catch {
        // Diagnosis model might not have these fields
      }

      const allMatchedIds = [...new Set([...protocolPatientIds, ...diagnosisPatientIds])];

      if (allMatchedIds.length > 0) {
        targetPatients = await prisma.user.findMany({
          where: { id: { in: allMatchedIds as string[] }, role: "PATIENT", isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
      }
    }

    if (targetPatients.length === 0) {
      return NextResponse.json({
        error: "No matching patients found for the selected criteria.",
        sentCount: 0,
      }, { status: 404 });
    }

    // Create assignments for each patient
    let assignedCount = 0;
    for (const patient of targetPatients) {
      // Check if already assigned
      const existing = await (prisma as any).educationAssignment.findFirst({
        where: { contentId, patientId: patient.id },
      });

      if (!existing) {
        await (prisma as any).educationAssignment.create({
          data: {
            contentId,
            patientId: patient.id,
            clinicId,
            assignedById: user.id,
          },
        });
        assignedCount++;
      }
    }

    // Send notifications to patients
    try {
      for (const patient of targetPatients) {
        await (prisma as any).notification.create({
          data: {
            userId: patient.id,
            clinicId,
            type: "EDUCATION_ASSIGNED",
            title: "New Educational Content",
            message: `New content assigned to you: "${content.title}"`,
            data: { contentId: content.id },
          },
        });
      }
    } catch (notifErr) {
      console.warn("[edu-send] Notification creation failed:", notifErr);
    }

    return NextResponse.json({
      success: true,
      sentCount: assignedCount,
      totalPatients: targetPatients.length,
      alreadyAssigned: targetPatients.length - assignedCount,
      patients: targetPatients.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
      })),
    });
  } catch (err: any) {
    console.error("[edu-send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
