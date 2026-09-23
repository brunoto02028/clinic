// GET /api/patients/[id]/automation-runs — what the engine did for this
// patient, and on what figures (activity 072, T-5).
//
// The question this answers is the one nobody could answer before: why did
// this patient get this?
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { runsForPatient } from "@/lib/automation/run";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  // The patient has to be in the actor's clinic — otherwise an id from another
  // tenant would read that tenant's history.
  const patient = await prisma.user.findFirst({
    // role too: a staff member's own id answered 200 with an empty list, which
    // is not a leak but is an answer to a question nobody asked.
    where: { id: params.id, clinicId: actor.clinicId, role: "PATIENT" },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  return NextResponse.json({ runs: await runsForPatient(params.id, actor.clinicId) });
}
