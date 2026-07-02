import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { generateRehabPlan, PatientContext } from "@/lib/rehab-agent";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// GET /api/admin/patients/[id]/rehab-plan — list all plans for patient
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await (prisma as any).rehabPlan.findMany({
    where: { patientId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      chiefComplaint: true,
      bodyPart: true,
      severity: true,
      phase: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      planJson: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(plans);
}

// POST /api/admin/patients/[id]/rehab-plan — generate new plan
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    chiefComplaint,
    bodyPart,
    severity,
    phase,
    age,
    sex,
    occupation,
    activityLevel,
    duration,
    mechanism,
    aggravatingFactors,
    relievingFactors,
    previousTreatment,
    relevantHistory,
    assessmentFindings,
    additionalNotes,
  } = body;

  if (!chiefComplaint || !bodyPart) {
    return NextResponse.json(
      { error: "chiefComplaint and bodyPart are required" },
      { status: 400 }
    );
  }

  // Fetch recent previous plans for context
  const previousPlansRaw = await (prisma as any).rehabPlan.findMany({
    where: { patientId: params.id, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { chiefComplaint: true, bodyPart: true, createdAt: true, planJson: true },
  });

  const previousPlans =
    previousPlansRaw.length > 0
      ? previousPlansRaw
          .map(
            (p: any) =>
              `[${new Date(p.createdAt).toLocaleDateString("en-GB")}] ${p.bodyPart} — ${p.chiefComplaint}`
          )
          .join("\n")
      : undefined;

  const patientContext: PatientContext = {
    chiefComplaint,
    bodyPart,
    severity: severity || "moderate",
    phase: phase || "subacute",
    age,
    sex,
    occupation,
    activityLevel,
    duration,
    mechanism,
    aggravatingFactors,
    relievingFactors,
    previousTreatment,
    relevantHistory,
    assessmentFindings,
    additionalNotes,
    previousPlans,
  };

  try {
    const planOutput = await generateRehabPlan(patientContext);

    const saved = await (prisma as any).rehabPlan.create({
      data: {
        patientId: params.id,
        createdById: (session.user as any).id,
        chiefComplaint,
        bodyPart,
        severity: severity || "moderate",
        phase: phase || "subacute",
        additionalNotes,
        planJson: planOutput as any,
        status: "active",
      },
    });

    return NextResponse.json({ plan: saved, output: planOutput });
  } catch (err: any) {
    console.error("[rehab-plan] Generation error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
